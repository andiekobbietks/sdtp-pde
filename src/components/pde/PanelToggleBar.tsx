import { Button } from "@/components/ui/button";
import { ExternalLink, type LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type PanelState = "visible" | "hidden" | "undocked";

interface PanelConfig {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PanelToggleBarProps {
  panels: PanelConfig[];
  states: Record<string, PanelState>;
  onToggle: (id: string) => void;
  onUndock: (id: string) => void;
}

const PanelToggleBar = ({ panels, states, onToggle, onUndock }: PanelToggleBarProps) => {
  return (
    <div className="flex items-center gap-1">
      {panels.map((panel) => {
        const state = states[panel.id] || "hidden";
        const isVisible = state === "visible";
        const isUndocked = state === "undocked";

        return (
          <div key={panel.id} className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={isVisible ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => onToggle(panel.id)}
                  className={`h-7 gap-1.5 text-xs ${
                    isUndocked
                      ? "border border-forge-oracle/50 text-forge-oracle"
                      : isVisible
                      ? "border border-primary/30"
                      : "text-muted-foreground"
                  }`}
                >
                  <panel.icon className="h-3 w-3" />
                  {panel.label}
                  {isUndocked && (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-forge-oracle" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isUndocked ? `${panel.label} is in a separate tab` : isVisible ? `Hide ${panel.label}` : `Show ${panel.label}`}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => onUndock(panel.id)}
                  disabled={isUndocked}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isUndocked ? "Already undocked" : `Undock ${panel.label} to new tab`}
              </TooltipContent>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
};

export default PanelToggleBar;
