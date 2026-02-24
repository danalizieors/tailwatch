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
    <Card className="border-white/70 bg-white/80 backdrop-blur">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FolderTree className="h-4 w-4 text-primary" />
          <CardTitle>Topic Hierarchy</CardTitle>
        </div>
        <CardDescription>Filter the dashboard by URL-like event path.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button
          variant={selectedTopic ? 'outline' : 'secondary'}
          className="w-full justify-start"
          onClick={() => onSelectTopic(undefined)}
        >
          All topics
        </Button>
        <div className="scroll-thin max-h-[24rem] space-y-1 overflow-auto pr-1">
          {tree.length === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">No topics yet.</p>
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
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => onSelectTopic(node.path)}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted',
          isSelected && 'bg-accent text-accent-foreground',
        )}
        style={{ paddingLeft: `${0.5 + level * 0.8}rem` }}
      >
        <span className="truncate">{node.name}</span>
        <span className="ml-2 rounded bg-background px-1.5 py-0.5 text-xs text-muted-foreground">{node.count}</span>
      </button>
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
  )
}

