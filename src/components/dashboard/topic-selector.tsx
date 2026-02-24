import { useState, useMemo, useRef, useEffect } from 'react'
import { ChevronRight, Search, X, Home } from 'lucide-react'
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
          .slice(0, 15)
      }
  
      // If no query, show children of the selected topic
      if (selectedTopic) {
        return allTopics
          .filter(
            (t) =>
              t.path.startsWith(selectedTopic + '/') &&
              t.path.split('/').length === selectedTopic.split('/').length + 1
          )
          .sort((a, b) => b.count - a.count)
          .slice(0, 15)
      }
  
      // If no query and no selection, show root topics
      return allTopics
        .filter((t) => !t.path.includes('/'))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)
    }, [allTopics, query, selectedTopic])
  
    const segments = useMemo(() => {
      if (!selectedTopic) return []
      return selectedTopic.split('/')
    }, [selectedTopic])
  
    // Reset active index when dropdown opens or query changes
    useEffect(() => {
      setActiveIndex(-1)
    }, [isOpen, query, selectedTopic])
  
    // Handle clicking outside to close
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])
  
    const handleKeyDown = (e: React.KeyboardEvent) => {
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
            
            // Check if the selected topic has any children
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
  
    // Scroll active item into view
    useEffect(() => {
      if (activeIndex >= 0 && listRef.current) {
        const activeElement = listRef.current.children[activeIndex] as HTMLElement
        if (activeElement) {
          activeElement.scrollIntoView({ block: 'nearest' })
        }
      }
    }, [activeIndex])
  
    return (
      <div className="relative space-y-2" ref={dropdownRef}>
              <div 
                className={cn(
                  "group flex flex-wrap items-center min-h-[40px] px-2.5 py-1.5 bg-background/50 border rounded-xl transition-all shadow-sm gap-y-1",
                  isOpen ? "border-primary/40 ring-1 ring-primary/40" : "border-border/50 hover:border-border"
                )}
                onClick={() => inputRef.current?.focus()}
              >
                {/* ROOT / */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectTopic(undefined)
                  }}
                  className={cn(
                    "text-[11px] font-mono px-1 rounded hover:bg-white/10 transition-colors font-bold shrink-0",
                    !selectedTopic ? "text-primary" : "text-muted-foreground/60"
                  )}
                  aria-label="Go to root"
                >
                  /
                </button>
        
                {/* BREADCRUMB SEGMENTS */}
                {segments.map((segment, idx) => {
                  const path = segments.slice(0, idx + 1).join('/')
                  const color = getPathColor(path)
                  const isLast = idx === segments.length - 1
                  
                  return (
                    <div key={path} className="flex items-center shrink-0 h-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectTopic(path)
                        }}
                        className={cn(
                          "text-[11px] font-mono px-1 py-0.5 rounded transition-all",
                          isLast ? "bg-white/10 font-bold" : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
                        )}
                        style={{ color: isLast ? color : undefined }}
                      >
                        {segment}
                      </button>
                      <span className="text-muted-foreground/20 font-mono text-[11px] px-0.5 select-none">/</span>
                    </div>
                  )
                })}
        
                {/* INLINE SEARCH */}
                <div className="relative flex-1 min-w-[60px] h-full flex items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    aria-controls="topic-listbox"
                    aria-activedescendant={activeIndex >= 0 ? `topic-item-${activeIndex}` : undefined}
                    className="w-full bg-transparent text-[11px] font-mono focus:outline-none placeholder:text-muted-foreground/20 text-foreground leading-none h-full py-0"
                    placeholder={segments.length === 0 ? "namespace..." : "..."}
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
                    className="ml-auto text-muted-foreground/30 hover:text-foreground/60 transition-colors p-1 flex items-center shrink-0"
                    aria-label="Clear selection"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
                {/* DROPDOWN */}
        {isOpen && filteredTopics.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div 
              id="topic-listbox"
              role="listbox"
              className="max-h-64 overflow-y-auto scroll-thin" 
              ref={listRef}
            >
              {filteredTopics.map((topic, index) => {
                const color = getPathColor(topic.path)
                const isSelected = selectedTopic === topic.path
                const isActive = activeIndex === index
                
                return (
                  <button
                    id={`topic-item-${index}`}
                    key={topic.path}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-2.5 text-left text-[11px] font-mono transition-colors border-b border-border/5 last:border-0",
                      isActive ? "bg-white/10" : isSelected ? "bg-white/5" : "hover:bg-white/5"
                    )}
                      onClick={() => {
                        onSelectTopic(topic.path)
                        setQuery('')
                        // Only keep open if there are children to drill into
                        const hasChildren = allTopics.some(t => 
                          t.path.startsWith(topic.path + '/') && 
                          t.path.split('/').length === topic.path.split('/').length + 1
                        )
                        setIsOpen(hasChildren)
                      }}
                    
                    onMouseEnter={() => setActiveIndex(index)}
                  >
  
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-foreground/90" style={{ color: isSelected || isActive ? color : undefined }}>
                      {topic.path}
                    </span>
                    <span className="text-[9px] text-muted-foreground/40 uppercase tracking-tighter">
                      {topic.name}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0 ml-4 opacity-50 bg-background/50 border-border/40">
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
