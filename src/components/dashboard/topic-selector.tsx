import { useState, useMemo, useRef, useEffect, KeyboardEvent } from 'react'
import { Search, X } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import type { TopicNode } from '~/lib/types'
import { cn, getPathColor } from '~/lib/utils'
import { PathDisplay } from './path-display'

interface TopicSelectorProps {
  tree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
  placeholder?: string
  className?: string
}

export function TopicSelector({ tree, selectedTopic, onSelectTopic, placeholder = "Filter...", className }: TopicSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldFocusRef = useRef(false)

  // Flatten the tree for easy searching
  const allTopics = useMemo(() => {
    const list: { path: string; name: string; count: number }[] = []
    const traverse = (nodes: TopicNode[]) => {
      if (!nodes) return
      for (const node of nodes) {
        const path = node.path || ''
        list.push({ path, name: node.name || '', count: node.count || 0 })
        traverse(node.children)
      }
    }
    traverse(tree)
    return list
  }, [tree])

  const filteredTopics = useMemo(() => {
    if (query) {
      return allTopics
        .filter((t) => (t.path || '').toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
    }

    if (selectedTopic) {
      return allTopics
        .filter(
          (t) =>
            t.path &&
            t.path.startsWith(selectedTopic + '/') &&
            t.path.split('/').length === selectedTopic.split('/').length + 1
        )
        .sort((a, b) => b.count - a.count)
        .slice(0, 12)
    }

    return allTopics
      .filter((t) => t.path && !t.path.includes('/'))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12)
  }, [allTopics, query, selectedTopic])

  const normalizedQueryPath = useMemo(() => normalizeCustomTopicPath(query), [query])
  const hasExactQueryMatch = useMemo(() => {
    if (!normalizedQueryPath) return false
    return allTopics.some((topic) => topic.path === normalizedQueryPath)
  }, [allTopics, normalizedQueryPath])

  useEffect(() => {
    if (isOpen && normalizedQueryPath && !hasExactQueryMatch) {
      setActiveIndex(-1)
    } else if (isOpen && filteredTopics.length > 0) {
      setActiveIndex(0)
    } else {
      setActiveIndex(-1)
    }
  }, [isOpen, query, selectedTopic, filteredTopics.length, normalizedQueryPath, hasExactQueryMatch])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (shouldFocusRef.current) {
      inputRef.current?.focus()
      shouldFocusRef.current = false
    }
  }, [selectedTopic, isOpen])

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown') setIsOpen(true)
      if (e.key === 'Backspace' && query === '' && selectedTopic) {
        e.preventDefault()
        const parentPath = selectedTopic.split('/').slice(0, -1).join('/')
        handleSelectTopic(parentPath || undefined)
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
          handleSelectTopic(topic.path)
          setQuery('')
          setIsOpen(true)
        } else {
          const customPath = normalizeCustomTopicPath(query)
          if (customPath) {
            handleSelectTopic(customPath)
            setQuery('')
            setIsOpen(true)
          }
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
      case 'Backspace':
        if (query === '' && selectedTopic) {
          e.preventDefault()
          const parentPath = selectedTopic.split('/').slice(0, -1).join('/')
          handleSelectTopic(parentPath || undefined)
          setIsOpen(true)
        }
        break
      case 'Tab':
        setIsOpen(false)
        break
    }
  }

  const handleSelectTopic = (topic?: string) => {
    shouldFocusRef.current = true
    setIsOpen(true)
    onSelectTopic(topic)
  }

  return (
    <div className={cn("relative flex-1 min-w-0", className)} ref={dropdownRef}>
      <div 
        className={cn(
          "flex items-center h-10 md:h-9 px-2 md:px-3 bg-secondary/30 border rounded-lg transition-all gap-0.5",
          isOpen ? "border-primary/50 ring-2 ring-primary/10 bg-background shadow-sm" : "border-border/60 hover:border-border",
          className?.includes('!bg-transparent') && !isOpen && "bg-transparent border-transparent"
        )}
        onClick={() => {
          shouldFocusRef.current = true
          inputRef.current?.focus()
        }}
      >
        <Search className="h-3.5 w-3.5 text-zinc-400 mr-1 md:mr-1.5 shrink-0" />
        
        {/* DRILLDOWN / BREADCRUMBS */}
        <div className="no-scrollbar flex min-w-0 shrink max-w-[55%] items-center sm:max-w-[70%] md:max-w-[80%]">
           <PathDisplay 
             path={selectedTopic || ''} 
             onClickSegment={handleSelectTopic} 
             segmentClassName="text-xs"
           />
        </div>

        {/* INPUT */}
        <div className="relative flex h-full min-w-[3.5rem] flex-1 items-center">
          <input
            ref={inputRef}
            type="text"
            className="w-full bg-transparent text-xs font-mono focus:outline-none placeholder:text-zinc-400 text-foreground font-medium"
            placeholder={!selectedTopic ? placeholder : "..."}
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
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setQuery('')
              if (!query) {
                shouldFocusRef.current = true
                onSelectTopic(undefined)
              } else {
                inputRef.current?.focus()
              }
            }}
            className="ml-1 md:ml-2 text-zinc-500 hover:text-destructive p-1 shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* DROPDOWN */}
      {isOpen && (filteredTopics.length > 0 || Boolean(normalizedQueryPath && !hasExactQueryMatch)) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200">
          <div role="listbox" className="max-h-80 overflow-y-auto scroll-thin py-1" ref={listRef}>
            {normalizedQueryPath && !hasExactQueryMatch ? (
              <button
                type="button"
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors",
                  activeIndex === -1 ? "bg-accent" : "hover:bg-accent/30"
                )}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelectTopic(normalizedQueryPath)
                  setQuery('')
                  setIsOpen(true)
                }}
                onMouseEnter={() => setActiveIndex(-1)}
              >
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-mono font-bold text-foreground">
                    {normalizedQueryPath}
                  </span>
                  <span className="text-xs text-zinc-400 font-bold uppercase tracking-tighter">
                    Use custom path
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono opacity-50">
                  New
                </Badge>
              </button>
            ) : null}
            {filteredTopics.map((topic, index) => {
              const color = getPathColor(topic.path || '')
              const isSelected = selectedTopic === topic.path
              const isActive = activeIndex === index
              
              return (
                <button
                  key={topic.path || index}
                  type="button"
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors",
                    isActive ? "bg-accent" : isSelected ? "bg-accent/50" : "hover:bg-accent/30"
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleSelectTopic(topic.path)
                    setQuery('')
                    setIsOpen(true)
                  }}
                  onMouseEnter={() => setActiveIndex(index)}
                >
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-xs font-mono font-bold text-foreground" style={{ color: isSelected || isActive ? color : undefined }}>
                      {topic.path}
                    </span>
                    <span className="text-xs text-zinc-400 font-bold uppercase tracking-tighter">
                      {topic.name}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs tabular-nums font-mono opacity-40">
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

function normalizeCustomTopicPath(value: string) {
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return undefined
  return trimmed.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/')
}
