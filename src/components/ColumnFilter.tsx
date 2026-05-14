import { useState, useMemo } from 'react';
import { Filter, ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// ── Sort direction type ────────────────────────────────────────────────────
export type SortDir = 'asc' | 'desc' | null;

// ── ColumnFilter Props ─────────────────────────────────────────────────────
interface ColumnFilterProps {
    title: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    sortDir?: SortDir;
    onSort?: (dir: SortDir) => void;
    dark?: boolean;
}

export function ColumnFilter({ title, options, selected, onChange, sortDir, onSort, dark = false }: ColumnFilterProps) {
    const [open, setOpen] = useState(false);
    const [filterSearch, setFilterSearch] = useState('');

    const allOptionsSelected = options.length > 0 && selected.length === options.length;
    const isFiltered = selected.length > 0;

    const filteredOptions = useMemo(() => {
        if (!filterSearch) return options;
        const q = filterSearch.toLowerCase();
        return options.filter(o => (o || '—').toLowerCase().includes(q));
    }, [options, filterSearch]);

    const handleToggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter(s => s !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    const handleSelectAllAction = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onChange([...options]);
        } else {
            onChange([]);
        }
    };

    const cycleSortDir = () => {
        if (!onSort) return;
        if (sortDir === null || sortDir === undefined) onSort('asc');
        else if (sortDir === 'asc') onSort('desc');
        else onSort(null);
    };

    const SortIcon = sortDir === 'asc' ? ArrowUp : sortDir === 'desc' ? ArrowDown : ArrowUpDown;
    const iconInactiveClass = dark ? 'text-white/70 hover:bg-white/15' : 'text-slate-500 hover:bg-slate-200/80';
    const iconActiveClass = dark ? 'text-white' : 'text-primary';

    return (
        <div className="relative inline-flex max-w-full items-start gap-1.5 align-top">
            <span className="min-w-0 whitespace-normal break-normal text-[12px] font-bold leading-snug">
                {title}
            </span>

            <div className="flex shrink-0 items-center gap-1 pt-0.5">
                {/* Sort button */}
                {onSort && (
                    <button
                        onClick={cycleSortDir}
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${sortDir ? iconActiveClass : iconInactiveClass}`}
                        aria-label={`Sort ${title}`}
                        title={sortDir === 'asc' ? 'Sorted ascending' : sortDir === 'desc' ? 'Sorted descending' : 'Click to sort'}
                    >
                        <SortIcon className="h-3.5 w-3.5" />
                    </button>
                )}

                {/* Filter button */}
                <Popover
                    open={open}
                    onOpenChange={(nextOpen) => {
                        setOpen(nextOpen);
                        if (!nextOpen) setFilterSearch('');
                    }}
                >
                    <PopoverTrigger asChild>
                        <button
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition-colors ${isFiltered ? iconActiveClass : iconInactiveClass}`}
                            aria-label={`Filter ${title}`}
                            title="Filter"
                        >
                            <Filter className={`h-3.5 w-3.5 ${isFiltered && !dark ? 'fill-primary/20' : ''}`} />
                        </button>
                    </PopoverTrigger>

                    <PopoverContent
                        align="start"
                        side="bottom"
                        sideOffset={6}
                        className="z-[9999] w-[260px] p-0 bg-popover text-slate-700"
                    >
                        {/* Search box inside popup */}
                        <div className="p-1.5 border-b">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full pl-6 pr-2 py-1 text-xs rounded border border-input bg-background outline-none focus:ring-1 focus:ring-ring"
                                    autoFocus
                                />
                            </div>
                        </div>

                        {/* Options list */}
                        <div className="max-h-[240px] overflow-auto p-1.5">
                            <div className="mb-1 flex items-center justify-between px-2 py-1">
                                <span className="text-[11px] text-muted-foreground">Filter values</span>
                                <button
                                    type="button"
                                    onClick={() => onChange([])}
                                    disabled={!isFiltered}
                                    className="text-[11px] font-medium text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Clear
                                </button>
                            </div>
                            <label className="flex items-center gap-2 px-2 py-1 text-xs text-slate-700 cursor-pointer hover:bg-muted rounded">
                                <input
                                    type="checkbox"
                                    checked={allOptionsSelected}
                                    onChange={handleSelectAllAction}
                                    className="h-3 w-3 rounded border-input accent-primary"
                                />
                                <span className="font-medium">Select All</span>
                            </label>
                            <div className="my-1 h-px bg-border" />
                            {filteredOptions.length === 0 ? (
                                <p className="text-xs text-muted-foreground px-2 py-1">No matches</p>
                            ) : (
                                filteredOptions.map(opt => (
                                    <label key={opt} className="flex items-center gap-2 px-2 py-1 text-xs text-slate-700 cursor-pointer hover:bg-muted rounded">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(opt)}
                                            onChange={() => handleToggle(opt)}
                                            className="h-3 w-3 rounded border-input accent-primary"
                                        />
                                        <span className="truncate">{opt || '—'}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}

/** Extracts unique non-empty values from an array of items for a given key */
export function getUniqueValues<T>(items: T[], accessor: (item: T) => string | undefined): string[] {
    const set = new Set<string>();
    items.forEach(item => {
        const val = accessor(item);
        if (val) set.add(val);
    });
    return Array.from(set).sort();
}
