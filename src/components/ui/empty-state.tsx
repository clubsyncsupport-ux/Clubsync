export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 animate-fade-in">
      {icon && <div className="mb-3 text-4xl">{icon}</div>}
      <p className="text-[15px] font-medium text-text-primary">{title}</p>
      {description && <p className="mt-1 max-w-xs text-sm text-text-secondary">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
