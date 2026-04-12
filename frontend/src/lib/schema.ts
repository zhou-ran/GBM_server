import type { ColumnDef, Schema } from '../types/schema';

export function getSchemaColumn(schema: Schema | null, name: string): ColumnDef | undefined {
  return schema?.columns.find((column) => column.name === name);
}

export function getSchemaCategories(schema: Schema | null, name: string): string[] {
  return getSchemaColumn(schema, name)?.categories ?? [];
}

export function readSchemaCategory(
  schema: Schema | null,
  column: string,
  code: number | undefined,
  fallback: string,
): string {
  if (code === undefined || code < 0) {
    return fallback;
  }

  return getSchemaCategories(schema, column)[code] ?? fallback;
}
