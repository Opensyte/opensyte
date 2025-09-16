"use client";
import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "~/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  action?: {
    icon: LucideIcon;
    onClick: () => void;
    tooltip?: string;
  };
  items?: {
    title: string;
    url: string;
  }[];
}

export function NavMain({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  // Extract orgId from pathname
  const orgId = pathname.split("/")[1];

  // Replace [orgId] placeholder with actual orgId
  const getUrl = (url: string) => {
    return url.replace("[orgId]", orgId!);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => {
          const itemUrl = getUrl(item.url);
          // Check if this item or any of its children are active
          const isItemActive = pathname.startsWith(itemUrl);
          const hasActiveChild = item.items?.some(
            subItem => pathname === getUrl(subItem.url)
          );
          const isActive = isItemActive || hasActiveChild;
          const hasSubItems = item.items && item.items.length > 0;

          // If no sub-items, render as a simple link instead of collapsible
          if (!hasSubItems) {
            return (
              <SidebarMenuItem key={item.title}>
                <div className="group/item flex w-full items-center">
                  <SidebarMenuButton
                    tooltip={item.title}
                    isActive={isActive}
                    asChild
                    className="flex-1"
                  >
                    <Link href={itemUrl}>
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.action && (
                    <button
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.action!.onClick();
                      }}
                      className="ml-1 h-8 w-8 rounded-sm opacity-60 hover:opacity-100 hover:bg-accent flex items-center justify-center"
                      title={item.action.tooltip}
                    >
                      <item.action.icon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </SidebarMenuItem>
            );
          }

          // If has sub-items, render as collapsible
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <div className="group/item flex w-full items-center">
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      tooltip={item.title}
                      isActive={isActive}
                      className="flex-1"
                    >
                      {item.icon && <item.icon />}
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 opacity-0 group-hover/item:opacity-100 group-data-[state=open]/collapsible:rotate-90 group-data-[state=open]/collapsible:opacity-100" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  {item.action && (
                    <button
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        item.action!.onClick();
                      }}
                      className="ml-1 h-8 w-8 rounded-sm opacity-60 hover:opacity-100 hover:bg-accent flex items-center justify-center"
                      title={item.action.tooltip}
                    >
                      <item.action.icon className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items?.map(subItem => {
                      const subItemUrl = getUrl(subItem.url);
                      const isSubItemActive = pathname === subItemUrl;
                      return (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={isSubItemActive}
                          >
                            <Link href={subItemUrl}>
                              <span>{subItem.title}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
