import type { PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js'

export type QueryResult<T> = PostgrestSingleResponse<T>
export type QueryResultMany<T> = PostgrestResponse<T>
