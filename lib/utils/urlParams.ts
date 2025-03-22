/**
 * Sets data to the provided URLSearchParams.
 * If the data type is an Array, each element is appended to the URLSearchParams individually.
 *
 * It is assumed that each type provided can be safely cast to a string.
 */
export function setFlattenedParams(
  params: URLSearchParams,
  key: string,
  data: any | any[]
) {
  if (Array.isArray(data))
    data.forEach((val) => params.append(key, String(val)));
  else {
    params.set(key, data);
  }
}
