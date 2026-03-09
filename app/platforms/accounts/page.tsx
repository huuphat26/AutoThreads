import { AccountManagerPanel } from "@/components/dashboard/account-manager";
import { UsersIcon } from "@/components/ui/icons";

export const metadata = {
    title: "Quản lý tài khoản — AutoThreads",
};

export default function AccountsPage() {
    return (
        <main className="max-w-2xl mx-auto px-5 py-6 flex flex-col gap-6">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-slate-800">Quản lý tài khoản</h1>
                    <p className="text-xs text-slate-400">
                        Tài khoản được phát hiện tự động từ .env — chọn tài khoản để đăng bài
                    </p>
                </div>
            </div>

            <AccountManagerPanel />
        </main>
    );
}
