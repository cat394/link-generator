import { Symbols } from "./symbols.ts";

export function remove_query_area(path: string): string {
  const starting_query_index = path.indexOf(Symbols.Query);

  const is_include_query = starting_query_index > 0;

  return is_include_query ? path.slice(0, starting_query_index) : path;
}
