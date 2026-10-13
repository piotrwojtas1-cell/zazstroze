import { requireCustomerPage } from "@/server/auth/current";
import { listNotifications } from "@/server/services/notifications";
import { PageHeader } from "@/components/ui/misc";
import { NotificationList } from "@/components/app/notification-list";

export const metadata = { title: "Powiadomienia" };

export default async function NotificationsPage() {
  const user = await requireCustomerPage();
  const { items, unread } = await listNotifications(user.id);
  return (
    <div className="animate-fade-in">
      <PageHeader title="Powiadomienia" back="/profil" subtitle={unread > 0 ? `Nieprzeczytane: ${unread}` : "Wszystko przeczytane"} />
      <NotificationList
        unread={unread}
        items={items.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, category: n.category, read: !!n.readAt, createdAt: n.createdAt.toISOString() }))}
      />
    </div>
  );
}
