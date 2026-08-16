/** Writes data onto `URLSearchParams`, appending array elements one by one. */
export function setFlattenedParams<T>(
  params: URLSearchParams,
  key: string,
  data: T | T[]
) {
  if (Array.isArray(data))
    data.forEach((val) => params.append(key, String(val)));
  else {
    params.set(key, String(data));
  }
}
