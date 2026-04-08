import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useListQuery, invalidateListCache } from '../../hooks/use-list-query';
import { ScreenHeader } from './ScreenHeader';
import { SearchBar } from './SearchBar';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { FilterChips, type FilterOption } from './FilterChips';

interface Props<T> {
  title: string;
  subtitle?: string;
  endpoint: string;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor?: (item: T) => string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: string; // query param name for search (default: 'search')
  filters?: FilterOption[];
  filterKey?: string; // query param name for filter (default: 'status')
  defaultFilter?: string;
  extraParams?: Record<string, any>;
  createRoute?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  headerSummary?: (items: T[], total: number) => React.ReactNode;
  paginated?: boolean;
  pageSize?: number;
}

export function AdminListScreen<T extends { id: string }>({
  title,
  subtitle,
  endpoint,
  renderItem,
  keyExtractor = (i: any) => i.id,
  searchable = true,
  searchPlaceholder = 'Хайх...',
  searchKey = 'search',
  filters,
  filterKey = 'status',
  defaultFilter = '',
  extraParams = {},
  createRoute,
  emptyTitle = 'Мэдээлэл олдсонгүй',
  emptyMessage,
  emptyIcon,
  headerSummary,
  paginated = true,
  pageSize = 20,
}: Props<T>) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(defaultFilter);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = {
    ...extraParams,
    ...(debouncedSearch ? { [searchKey]: debouncedSearch } : {}),
    ...(filter ? { [filterKey]: filter } : {}),
  };

  const { data, total, loading, refreshing, loadingMore, error, hasMore, refetch, loadMore } = useListQuery<T>(
    endpoint,
    params,
    { pageSize, paginated },
  );

  // Refetch when screen regains focus
  useFocusEffect(
    useCallback(() => {
      invalidateListCache(endpoint);
      refetch();
    }, [endpoint]),
  );

  // Deduplicate by key to avoid React duplicate-key warnings if API returns dupes
  const uniqueData = React.useMemo(() => {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const item of data) {
      const k = keyExtractor(item);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(item);
      }
    }
    return out;
  }, [data, keyExtractor]);

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator color="#007AFF" style={{ paddingVertical: 16 }} />;
  };

  return (
    <View style={s.container}>
      <ScreenHeader
        title={title}
        subtitle={subtitle || (total > 0 ? `${total} бичлэг` : undefined)}
        rightIcon={createRoute ? 'add' : undefined}
        onRightPress={createRoute ? () => router.push(createRoute as any) : undefined}
      />

      {searchable && (
        <SearchBar value={search} onChangeText={setSearch} placeholder={searchPlaceholder} />
      )}

      {filters && filters.length > 0 && (
        <FilterChips options={filters} value={filter} onChange={setFilter} />
      )}

      {headerSummary && uniqueData.length > 0 ? (
        <View style={s.summaryWrap}>{headerSummary(uniqueData, total)}</View>
      ) : null}

      {loading && uniqueData.length === 0 ? (
        <LoadingState />
      ) : error && uniqueData.length === 0 ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <FlatList
          data={uniqueData}
          keyExtractor={keyExtractor}
          renderItem={({ item, index }) => <>{renderItem(item, index)}</>}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#007AFF" />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              message={emptyMessage}
              actionLabel={createRoute ? 'Шинээр үүсгэх' : undefined}
              onAction={createRoute ? () => router.push(createRoute as any) : undefined}
            />
          }
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  summaryWrap: { paddingHorizontal: 12, paddingTop: 12 },
});
