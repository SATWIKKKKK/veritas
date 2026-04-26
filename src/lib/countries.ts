import { customList } from 'country-codes-list';

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  label: string;
}

interface RestCountry {
  cca2?: string;
  idd?: {
    root?: string;
    suffixes?: string[];
  };
  name?: {
    common?: string;
  };
}

const COUNTRY_DELIMITER = '|||';
const COUNTRIES_API_URL = 'https://restcountries.com/v3.1/all?fields=cca2,idd,name';
export const DEFAULT_COUNTRY_CODE = 'IN';

const normalizeDialCode = (rawValue: string) => {
  const [firstCode] = rawValue.split(',');
  const digits = firstCode.replace(/[^\d+]/g, '');

  if (!digits) {
    return '';
  }

  return digits.startsWith('+') ? digits : `+${digits}`;
};

const toCountryOption = (code: string, name: string, dialCode: string): CountryOption | null => {
  const normalizedCode = code.trim().toUpperCase();
  const normalizedName = name.trim();
  const normalizedDialCode = normalizeDialCode(dialCode);

  if (!normalizedCode || !normalizedName || !normalizedDialCode) {
    return null;
  }

  return {
    code: normalizedCode,
    name: normalizedName,
    dialCode: normalizedDialCode,
    label: `${normalizedCode} ${normalizedDialCode}`,
  };
};

const dedupeCountries = (countries: CountryOption[]) => {
  const uniqueCountries = new Map<string, CountryOption>();

  for (const country of countries) {
    if (!uniqueCountries.has(country.code)) {
      uniqueCountries.set(country.code, country);
    }
  }

  return Array.from(uniqueCountries.values()).sort((left, right) => left.name.localeCompare(right.name));
};

const toDialCodeFromApi = (idd?: RestCountry['idd']) => {
  const root = idd?.root?.trim() ?? '';
  const suffix = idd?.suffixes?.find((value) => Boolean(value?.trim()))?.trim() ?? '';
  return `${root}${suffix}`;
};

const fallbackCountries = dedupeCountries(
  Object.entries(customList('countryCode', `{countryNameEn}${COUNTRY_DELIMITER}{countryCallingCode}`))
    .map(([code, value]) => {
      const [name, dialCode] = value.split(COUNTRY_DELIMITER);
      return toCountryOption(code, name ?? '', dialCode ?? '');
    })
    .filter((country): country is CountryOption => country !== null),
);

export const getFallbackCountries = () => fallbackCountries;

export const resolveCountrySelection = (
  countries: CountryOption[],
  currentCode = DEFAULT_COUNTRY_CODE,
) => {
  if (countries.some((country) => country.code === currentCode)) {
    return currentCode;
  }

  if (countries.some((country) => country.code === DEFAULT_COUNTRY_CODE)) {
    return DEFAULT_COUNTRY_CODE;
  }

  return countries[0]?.code ?? DEFAULT_COUNTRY_CODE;
};

export async function fetchCountryOptions(signal?: AbortSignal): Promise<CountryOption[]> {
  const response = await fetch(COUNTRIES_API_URL, { signal });

  if (!response.ok) {
    throw new Error(`Failed to load country dial codes: ${response.status}`);
  }

  const countries = dedupeCountries(
    ((await response.json()) as RestCountry[])
      .map((country) => {
        return toCountryOption(
          country.cca2 ?? '',
          country.name?.common ?? '',
          toDialCodeFromApi(country.idd),
        );
      })
      .filter((country): country is CountryOption => country !== null),
  );

  if (!countries.length) {
    throw new Error('Country dial code list is empty.');
  }

  return countries;
}
