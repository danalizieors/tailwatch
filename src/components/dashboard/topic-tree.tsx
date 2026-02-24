import { FolderTree } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import type { TopicNode } from '~/lib/types'
import { cn } from '~/lib/utils'

interface TopicTreePanelProps {
  tree: TopicNode[]
  selectedTopic?: string
  onSelectTopic: (topic?: string) => void
}

export function TopicTreePanel({ tree, selectedTopic, onSelectTopic }: TopicTreePanelProps) {
  return (
    <Card className="flex flex-col border-border/40 bg-card/40 backdrop-blur shadow-sm card-hover-effect overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/20 bg-background/20 relative z-10">
        <div className="flex items-center gap-2">
          <FolderTree className="h-5 w-5 text-primary" />
          <CardTitle className="font-mono text-lg tracking-tight">Namespace.Tree</CardTitle>
        </div>
        <CardDescription className="text-xs">Filter dashboard by event path hierarchy.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col p-4 space-y-3 relative z-10">
        <Button
          variant={selectedTopic ? 'outline' : 'secondary'}
          className={cn(
            "w-full justify-start font-mono text-sm tracking-wide transition-all border-border/40",
            !selectedTopic && "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          )}
          onClick={() => onSelectTopic(undefined)}
        >
          <span className="truncate">/*</span>
        </Button>
        <div className="scroll-thin max-h-[28rem] space-y-0.5 overflow-auto pr-1">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border/40 rounded-lg bg-background/30">
              <p className="text-xs font-mono text-muted-foreground opacity-60">{"<empty namespace>"}</p>
            </div>
          ) : (
            tree.map((node) => (
              <TopicTreeNodeRow
                key={node.id}
                node={node}
                level={0}
                selectedTopic={selectedTopic}
                onSelectTopic={onSelectTopic}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface TopicTreeNodeRowProps {
  node: TopicNode
  level: number
  selectedTopic?: string
  onSelectTopic: (topic: string) => void
}

function TopicTreeNodeRow({ node, level, selectedTopic, onSelectTopic }: TopicTreeNodeRowProps) {
  const isSelected = selectedTopic === node.path
  return (
    <div className="space-y-0.5 relative group/tree">
      {/* Decorative connecting lines for deep nesting */}
      {level > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 border-l border-border/20 pointer-events-none"
          style={{ left: `${0.5 + (level - 1) * 0.8}rem` }}
        />
      )}
      <button
        type="button"
        onClick={() => onSelectTopic(node.path)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-mono transition-all',
          'hover:bg-primary/5 hover:text-primary',
          isSelected ? 'bg-primary/10 text-primary font-semibold ring-1 ring-primary/20' : 'text-foreground/80'
        )}
        style={{ paddingLeft: `${0.5 + level * 0.8}rem` }}
      >
        <span className="truncate flex items-center gap-1.5">
          <span className={cn(
            "text-[10px] opacity-40 group-hover/tree:opacity-100 transition-opacity",
            isSelected && "text-primary opacity-80"
          )}>
            {node.children.length > 0 ? '+' : '-'}
          </span>
          {node.name}
        </span>
        <span className={cn(
          "ml-2 rounded px-1.5 py-0.5 text-[10px] transition-colors",
          isSelected ? "bg-primary/20 text-primary" : "bg-background/80 text-muted-foreground group-hover/tree:bg-primary/10 group-hover/tree:text-primary/70"
        )}>
          {node.count}
        </span>
      </button>
      {node.children.length > 0 && (
        <div className="pt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <TopicTreeNodeRow
              key={child.id}
              node={child}
              level={level + 1}
              selectedTopic={selectedTopic}
              onSelectTopic={onSelectTopic}
            />
          ))}
        </div>
      )}
    </div>
  )
}
