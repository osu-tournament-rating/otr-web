/**
 * Gets the names of each property on a type
 * @returns An object containing the names of each property of the given type
 */
export const keysOf = <T>() =>
  new Proxy({}, { get: (_, prop: string) => prop }) as {
    [K in keyof T]-?: NonNullable<K>;
  };

/**
 * Extracts the data from a form for a given type
 * @param formData Form data
 * @param transform A map of optional functions for each property that are used to transform the raw form data
 * @returns An object containing data for each property in T extracted from the given form data
 */
export function extractFormData<T>(
  formData: FormData,
  transform?: { [K in keyof T]?: (value: string) => any }
) {
  const result: { [K in keyof T]?: any | undefined } = {};

  for (const [k, v] of Array.from(formData.entries())) {
    result[k as keyof T] = transform?.[k as keyof T]?.(v as string) ?? v;
  }

  return result;
}

/**
 * Performs a shallow equality comparison of two objects
 * @param obj1 Object one
 * @param obj2 Object two
 */
export const isObjectEqual = <T>(obj1: T, obj2: T) => {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
};
