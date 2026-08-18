import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogOut, Utensils } from 'lucide-react'

const nav = [
  ['Dashboard','/dashboard'], ['Meals','/meals'], ['Expenses','/expenses'], ['Contributions','/contributions'], ['Reports','/reports'], ['Settings','/settings'],
]

export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold"><span className="rounded-xl bg-green-100 p-2 text-green-700"><Utensils size={18}/></span>MealHisab BD</Link>
          <form action={async () => { 'use server'; const s = await createClient(); await s.auth.signOut(); redirect('/login') }}>
            <button className="btn-secondary" aria-label="Sign out"><LogOut size={16}/><span className="ml-2 hidden sm:inline">Sign out</span></button>
          </form>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {nav.map(([label, href]) => <Link key={href} href={href} className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-900">{label}</Link>)}
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
