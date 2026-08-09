'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Combobox } from '@base-ui/react/combobox';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

/** Хоосон утга (= "бүгд") -г төлөөлөх онцгой сонголт. */
const ALL = '';

export interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  /** Заасан бол жагсаалтын эхэнд хоосон утгатай мөр нэмнэ ("Бүгд" г.м). */
  placeholder?: string;
  /** Сонголт хийгээгүй үед оролтод харагдах бичвэр. */
  emptyText?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  /** Оролтын хамгийн бага өргөн (Tailwind класс). */
  widthClass?: string;
  /**
   * Оролтын өөрийн загвар. Формын талбарууд хуудас тус бүрийн `inputClass`-ыг
   * дамжуулж, шүүлтүүрийн мөрөнд байгаа нь өгөгдмөл загварыг ашиглана.
   */
  inputClassName?: string;
  'aria-label'?: string;
}

const defaultInputCls =
  'h-9 w-full pl-8 rounded-xl bg-[#F5F6FA] border border-transparent text-[13px] text-[#1A1D26] ' +
  'placeholder-[#8C8FA3] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all';

/**
 * Бичиж хайх боломжтой сонголтын талбар.
 *
 * Хэрэглэгч текст бичихэд сонголтууд агуулсан эсэхээр (contains) шүүгдэнэ.
 * Шүүлт нь `Intl.Collator`-т суурилсан тул кирилл болон латин үсэгт адилхан
 * ажиллаж, том/жижиг үсэг болон аялгууны ялгааг үл тооно.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  emptyText = 'Сонгох...',
  disabled,
  required,
  className = '',
  widthClass = 'min-w-[170px]',
  inputClassName,
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  // "Бүгд" мөрийг жагсаалтын нэг хэсэг болгоно — ингэснээр сонголтоо буцааж
  // цэвэрлэх боломжтой болно.
  const items = useMemo<SelectOption[]>(
    () => (placeholder !== undefined ? [{ value: ALL, label: placeholder }, ...options] : options),
    [options, placeholder]
  );

  const selected = useMemo(
    () => items.find((o) => o.value === value) ?? null,
    [items, value]
  );

  // "Бүгд" сонгогдсон үед оролтод бодит текст болж суудаг байсан тул хайхын
  // тулд эхлээд түүнийг устгах шаардлагатай болдог байв. Оронд нь placeholder
  // хэлбэрээр харуулна — жагсаалтад мөр нь хэвээр үлдэх тул цэвэрлэх боломжтой.
  const inputValue = selected?.value === ALL ? null : selected;

  // Товшиход сонгосон утга бүхэлдээ тэмдэглэгдэж, шууд дарж бичих боломжтой
  // болно — өмнө нь хайхын тулд хуучин утгыг гараар устгах шаардлагатай байв.
  // Фокусын дотор шууд `select()` дуудвал Base UI-ийн дараах re-render оролтын
  // `value`-г дахин бичиж курсорыг эцэст нь буцаадаг тул commit-ийн дараа
  // ажиллах effect дотор хийнэ.
  const inputRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (focused) inputRef.current?.select();
  }, [focused]);

  // Хулганаар товшиход фокусын дараа mouseup курсорыг байрлуулж тэмдэглэлтийг
  // арилгадаг тул click дээр дахин тэмдэглэнэ. Аль хэдийн фокустай байсан бол
  // хэрэглэгч курсороо зориуд зөөж байгаа тул хөндөхгүй.
  const selectOnClickRef = useRef(false);

  // Өгөгдмөл шүүлт нь зөвхөн эхлэлээр тааруулдаг тул "агуулсан"-аар солино.
  // `sensitivity: 'base'` нь том/жижиг үсэг болон аялгууны ялгааг үл тооно.
  const filter = Combobox.useFilter({ sensitivity: 'base', value: inputValue });

  return (
    <Combobox.Root
      items={items}
      value={inputValue}
      disabled={disabled}
      filter={filter.contains}
      onValueChange={(next: SelectOption | null) => onChange(next?.value ?? ALL)}
      isItemEqualToValue={(a: SelectOption, b: SelectOption) => a?.value === b?.value}
    >
      <div className={`relative ${widthClass} ${className}`}>
        {/* Хайлтын дүрсийг зөвхөн өгөгдмөл загварт харуулна — формын
            талбарууд өөрийн padding-тай тул давхцах эрсдэлтэй. */}
        {!inputClassName && (
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8FA3]" />
        )}
        <Combobox.Input
          placeholder={emptyText}
          aria-label={ariaLabel}
          required={required}
          ref={inputRef}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onMouseDown={(e) => {
            selectOnClickRef.current = document.activeElement !== e.currentTarget;
          }}
          onClick={() => {
            if (!selectOnClickRef.current) return;
            selectOnClickRef.current = false;
            inputRef.current?.select();
          }}
          className={`${inputClassName ?? defaultInputCls} pr-9 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        />
        <Combobox.Trigger
          disabled={disabled}
          aria-label="Жагсаалт нээх"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-[#8C8FA3] hover:text-[#4A4D5C] disabled:opacity-50"
        >
          <Combobox.Icon render={<ChevronDown className="w-4 h-4" />} />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} className="isolate z-50">
          <Combobox.Popup className="max-h-[min(20rem,var(--available-height))] w-[var(--anchor-width)] min-w-[170px] overflow-y-auto rounded-xl bg-white p-1 shadow-lg ring-1 ring-[#E8ECF0] origin-[var(--transform-origin)] transition-[transform,opacity] data-open:scale-100 data-open:opacity-100 data-closed:scale-95 data-closed:opacity-0">
            <Combobox.Empty className="px-3 py-3 text-[13px] text-[#8C8FA3]">
              Олдсонгүй
            </Combobox.Empty>
            <Combobox.List>
              <Combobox.Collection>
                {(item: SelectOption) => (
                  <Combobox.Item
                    key={item.value || '__all__'}
                    value={item}
                    className="relative flex cursor-pointer select-none items-center gap-2 rounded-lg py-2 pl-3 pr-8 text-[13px] text-[#1A1D26] outline-none data-highlighted:bg-[#F2F4F7] data-selected:font-semibold"
                  >
                    <span className="flex-1 truncate">{item.label}</span>
                    <Combobox.ItemIndicator className="absolute right-2.5 flex items-center">
                      <Check className="w-4 h-4 text-[#007AFF]" />
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.Collection>
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
