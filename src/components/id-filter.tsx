"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface IdFilterProps {
  allIds: string[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

const IdFilter: React.FC<IdFilterProps> = ({ allIds, selectedIds, onSelectionChange }) => {
  const handleCheckboxChange = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
    }
  };

  const handleSelectAll = () => {
    onSelectionChange(allIds);
  };

  const handleDeselectAll = () => {
    onSelectionChange([]);
  };

  if (allIds.length === 0) {
    return <p className="text-sm text-muted-foreground p-4 text-center">No device IDs available.</p>;
  }

  return (
    <div className="space-y-3">
      <ScrollArea className="h-48 w-full rounded-md border p-4 shadow-inner bg-background">
        <div className="space-y-3">
          {allIds.map(id => (
            <div key={id} className="flex items-center space-x-3 p-1 hover:bg-muted rounded-md transition-colors">
              <Checkbox
                id={`filter-${id}`}
                checked={selectedIds.includes(id)}
                onCheckedChange={(checked) => handleCheckboxChange(id, !!checked)}
                aria-labelledby={`label-filter-${id}`}
                className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
              />
              <Label htmlFor={`filter-${id}`} id={`label-filter-${id}`} className="text-sm font-normal cursor-pointer flex-grow truncate" title={id}>
                {id}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex space-x-2 pt-2">
        <Button variant="outline" size="sm" onClick={handleSelectAll} className="flex-1">
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={handleDeselectAll} className="flex-1">
          Deselect All
        </Button>
      </div>
    </div>
  );
};

export default IdFilter;
