import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import type { TopicNode } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'

interface TopicSelectorProps {
  tree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
}

export function TopicSelector({ tree, selectedTopic, onSelectTopic }: TopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flatten the tree for easy searching
  const allTopics = useMemo(() => {
    const list: { path: string; name: string; count: number }[] = []
    const traverse = (nodes: TopicNode[]) => {
      for (const node of nodes) {
        list.push({ path: node.path, name: node.name, count: node.count })
        traverse(node.children)
      }
    }
    traverse(tree)
    return list
  }, [tree])

  const filteredTopics = useMemo(() => {
    if (query) {
      return allTopics
        .filter((t) => t.path.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
    }

    if (selectedTopic) {
      return allTopics
        .filter(
          (t) =>
            t.path.startsWith(selectedTopic + '/') &&
            t.path.split('/').length === selectedTopic.split('/').length + 1
        )
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
    }

    return allTopics
      .filter((t) => !t.path.includes('/'))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [allTopics, query, selectedTopic])

  const segments = useMemo(() => {
    if (!selectedTopic) return []
    return selectedTopic.split('/')
  }, [selectedTopic])

  useEffect(() => {
    setActiveIndex(-1)
  }, [isOpen, query, selectedTopic])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') setIsOpen(true)
      if (e.key === 'Backspace' && query === '' && segments.length > 0) {
        e.preventDefault()
        const parentPath = segments.slice(0, -1).join('/')
        onSelectTopic(parentPath || undefined)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIndex((prev) => (prev < filteredTopics.length - 1 ? prev + 1 : prev))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev))
        break
      case 'Enter':
        e.preventDefault()
        if (activeIndex >= 0 && activeIndex < filteredTopics.length) {
          const topic = filteredTopics[activeIndex]
          onSelectTopic(topic.path)
          setQuery('')
          const hasChildren = allTopics.some(t => 
            t.path.startsWith(topic.path + '/') && 
            t.path.split('/').length === topic.path.split('/').length + 1
          )
          setIsOpen(hasChildren)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Backspace':
        if (query === '' && segments.length > 0) {
          e.preventDefault()
          const parentPath = segments.slice(0, -1).join('/')
          onSelectTopic(parentPath || undefined)
          setIsOpen(true)
        }
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  return (
    <div className="relative flex-1" ref={dropdownRef}>
      <div 
        className={cn(
          "flex items-center min-h-[38px] md:min-h-[34px] px-2 md:px-3 bg-secondary/30 border rounded-lg transition-all gap-0.5",
          isOpen ? "border-primary/50 ring-2 ring-primary/10 bg-background shadow-sm" : "border-border/60 hover:border-border"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground/60 mr-1 md:mr-1.5 shrink-0" />
        
        {/* ROOT */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onSelectTopic(undefined)
          }}
          className={cn(
            "text-[10px] md:text-[11px] font-mono px-1 rounded hover:bg-muted font-bold shrink-0",
            !selectedTopic ? "text-primary" : "text-muted-foreground/40"
          )}
        >
          /
        </button>

        {/* SEGMENTS */}
        <div className="flex items-center overflow-x-auto no-scrollbar shrink-0 max-w-[50%] sm:max-w-[70%]">
          {segments.map((segment, idx) => {
            const path = segments.slice(0, idx + 1).join('/')
            const color = getPathColor(path)
            const isLast = idx === segments.length - 1
            
            return (
              <div key={path} className="flex items-center shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectTopic(path)
                  }}
                  className={cn(
                    "text-[10px] md:text-[11px] font-mono px-0.5 md:px-1 py-0.5 rounded transition-all whitespace-nowrap",
                    isLast ? "font-bold text-foreground/90" : "text-muted-foreground/60 hover:text-foreground hover:bg-muted"
                  )}
                  style={{ color: isLast ? color : undefined }}
                >
                  {segment}
                </button>
                <span className="text-border font-mono text-[10px] md:text-[11px] px-0.5 select-none opacity-60">/</span>
              </div>
            )
          })}
        </div>

        {/* INPUT */}
        <div className="relative flex-1 min-w-[30px] flex items-center h-full">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-[10px] md:text-[11px] font-mono focus:outline-none placeholder:text-muted-foreground/50 text-foreground font-medium"
            placeholder={segments.length === 0 ? "Filter..." : "..."}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {(query || selectedTopic) && (
          <button 
            onClick={(e) => {
              e.stopPropagation()
              setQuery('')
              if (!query) onSelectTopic(undefined)
            }}
            className="ml-1 md:ml-2 text-muted-foreground/40 hover:text-destructive p-1 shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* DROPDOWN */}
      {isOpen && filteredTopics.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border shadow-2xl rounded-xl overflow-hidden z-[100] animate-in fade-in slide-in-from-top-1 duration-200">
          <div role="listbox" className="max-h-60 overflow-y-auto scroll-thin py-1" ref={listRef}>
            {filteredTopics.map((topic, index) => {
              const color = getPathColor(topic.path)
              const isSelected = selectedTopic === topic.path
              const isActive = activeIndex === index
              
              return (
                <button
                  key={topic.path}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-accent" : isSelected ? "bg-accent/50" : "hover:bg-accent/30"
                  )}
                  onClick={() => {
                    onSelectTopic(topic.path)
                    setQuery('')
                    const hasChildren = allTopics.some(t => 
                      t.path.startsWith(topic.path + '/') && 
                      t.path.split('/').length === topic.path.split('/').length + 1
                    )
                    setIsOpen(hasChildren)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-mono font-bold text-foreground/90" style={{ color: isSelected || isActive ? color : undefined }}>
                      {topic.path}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50 font-bold uppercase tracking-tighter">
                      {topic.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] tabular-nums font-mono opacity-40">
                    {topic.count}
                  </Badge>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
