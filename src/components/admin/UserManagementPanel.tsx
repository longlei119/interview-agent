import { UserCanCreateToggle } from "./UserCanCreateToggle";
import { Badge, Icon } from "@/components/ui";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  canCreate: boolean;
  _count: { questions: number };
}

interface Props {
  users: AdminUser[];
  currentUserId: string;
}

export function UserManagementPanel({ users, currentUserId }: Props) {
  return (
    <section>
      <div className="mb-3">
        <h3 className="text-base font-semibold text-ink">用户管理</h3>
        <p className="mt-1 text-sm text-muted">管理用户加题权限和管理员标识。</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="divide-y divide-line">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-ink">{u.name}</span>
                  {u.role === "admin" && <Badge variant="brand">管理员</Badge>}
                </div>
                <div className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
                  <Icon name="user" size={11} />
                  {u.email} · 创建了 {u._count.questions} 道题
                </div>
              </div>
              <UserCanCreateToggle
                userId={u.id}
                canCreate={u.canCreate}
                isSelf={u.id === currentUserId}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
