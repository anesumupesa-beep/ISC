"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { loadSitePage } from "@/app/(app)/site-page-action";
import { adminNav, isAdminNavActive } from "@/lib/admin/nav";
import type { ActionResult, SitePage, Viewer } from "@/lib/types";
import { roleLabel } from "@/lib/types";
import { initials, navigation } from "@/lib/ui";
import type { IconName } from "./icons";
import { Icon } from "./icons";
import { Modal } from "./Modal";
import { RichText } from "./RichText";
import { SignOutButton } from "./SignOutButton";
import { TextLink } from "./ui";

type ShellModal = "contact" | "about" | "privacy" | "install" | null;
type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
type Shell = {
  notify: (message: string) => void;
  /** Toasts an action result (error, server message or fallback); returns whether it succeeded. */
  report: (result: ActionResult, fallback?: string) => boolean;
  openModal: (modal: Exclude<ShellModal, null>) => void;
};

const ShellContext = createContext<Shell | null>(null);
export function useShell() {
  const shell = use(ShellContext);
  if (!shell) throw new Error("useShell must be used inside AppShell");
  return shell;
}

type PageKey = "about" | "privacy" | "contact";

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
const subscribeStandalone = (cb: () => void) => {
  const query = window.matchMedia("(display-mode: standalone)");
  query.addEventListener("change", cb);
  return () => query.removeEventListener("change", cb);
};

export function AppShell({
  viewer,
  buddyEmail,
  pages,
  children,
}: {
  viewer: Viewer;
  buddyEmail?: string;
  pages?: Record<PageKey, SitePage>; // omitted for committee members, who load a page when they open it
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [modal, setModal] = useState<ShellModal>(null);
  const [toast, setToast] = useState("");
  const [loaded, setLoaded] = useState<Partial<Record<PageKey, SitePage>>>({});
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);
  // The worker knows when a navigation used its offline fallback, even if
  // the browser's navigator.onLine signal is optimistic after a reload.
  const [workerOffline, setWorkerOffline] = useState<boolean | null>(null);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const standalone = useSyncExternalStore(
    subscribeStandalone,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const offline = workerOffline ?? !online;
  const isInstalled = standalone || justInstalled;
  const contentRef = useRef<HTMLElement>(null);
  const lastPath = useRef(pathname);

  const student = viewer.role === "student";
  const workspace =
    viewer.role === "isc_admin"
      ? { page: "Committee workspace", href: "/admin", short: "Workspace", icon: "arrival" as IconName }
      : viewer.role === "welfare_staff"
        ? { page: "Welfare queue", href: "/welfare-staff", short: "Queue", icon: "lock" as IconName }
        : null;
  const home = workspace?.href ?? "/";
  const admin = viewer.role === "isc_admin";
  const currentTitle = admin
    ? (adminNav.find((item) => isAdminNavActive(pathname, item.href))?.page ?? "Committee workspace")
    : pathname === "/welfare-staff"
      ? "Welfare workspace"
      : (navigation.find((item) => item.href === pathname)?.page ?? "Overview");
  const navItems = admin ? adminNav : workspace ? [workspace] : navigation;
  const isActive = (href: string) => (admin ? isAdminNavActive(pathname, href) : pathname === href);

  useEffect(() => {
    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    const resetWorker = () => setWorkerOffline(null);
    const workerNetworkState = (event: MessageEvent) => {
      if (event.data?.type === "ISC_NETWORK_STATE") setWorkerOffline(event.data.offline);
    };
    const installed = () => {
      setJustInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("online", resetWorker);
    window.addEventListener("offline", resetWorker);
    window.addEventListener("appinstalled", installed);
    navigator.serviceWorker?.addEventListener("message", workerNetworkState);
    navigator.serviceWorker?.controller?.postMessage({ type: "ISC_NETWORK_STATE" });
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", resetWorker);
      window.removeEventListener("offline", resetWorker);
      window.removeEventListener("appinstalled", installed);
      navigator.serviceWorker?.removeEventListener("message", workerNetworkState);
    };
  }, []);
  useEffect(() => {
    if (!modal || modal === "install" || pages || loaded[modal]) return;
    let live = true;
    loadSitePage(modal).then((page) => live && page && setLoaded((x) => ({ ...x, [modal]: page })));
    return () => {
      live = false;
    };
  }, [modal, pages, loaded]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  // Move focus to the new page's content after client navigation (not on first load).
  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    contentRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const report = useCallback((result: ActionResult, fallback?: string) => {
    if (!result.ok) setToast(result.error);
    else if (result.message || fallback) setToast(result.message ?? fallback ?? "");
    return result.ok;
  }, []);
  const shell = useMemo<Shell>(
    () => ({ notify: setToast, report, openModal: setModal }),
    [report],
  );

  async function installApp() {
    if (!installPrompt) {
      setModal("install");
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  const page = modal && modal !== "install" ? (pages?.[modal] ?? loaded[modal]) : undefined;

  return (
    <ShellContext value={shell}>
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <aside className="sidebar">
          <Link className="brand" href={home} aria-label="ISC Connect home">
            <span className="brand-symbol">
              <Icon name="globe" size={27} />
            </span>
            <span>
              <strong>
                ISC<span>Connect</span>
                <i />
              </strong>
              <small>INFORM. CONNECT. SUPPORT.</small>
            </span>
          </Link>
          <div className="brand-subtitle">UTM · International Student Club</div>
          <div className="sidebar-label">YOUR STUDENT COMPANION</div>
          <nav aria-label="Main navigation">
            {/* Buttons (not <a>) because globals.css styles `.sidebar nav > button`. */}
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={isActive(item.href) ? "active" : ""}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <Icon name={item.icon} size={20} />
                {item.page}
                {item.href === "/updates" && <span className="nav-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-motto">
              <span>
                Far from home.
                <br />
                <strong>Never on your own.</strong>
              </span>
              <Icon name="leaf" size={30} />
            </div>
            <button className="install-button" onClick={installApp}>
              <Icon name="download" size={17} />
              {isInstalled ? "App installed" : "Take ISC Connect with you"}
              <Icon name="plus" size={13} />
            </button>
            <div className="institution">
              <span className="utm-mark">
                UTM
                <span>
                  UNIVERSITY OF
                  <br />
                  TECHNOLOGY, MAURITIUS
                </span>
              </span>
              <p>
                <Icon name="shield" size={12} />
                Approved UTM Club Platform
              </p>
              <button onClick={() => setModal("privacy")}>
                Mauritius DPA 2017 Compliant <Icon name="external" size={11} />
              </button>
              <span className="demo-caption">INTERACTIVE PROTOTYPE · DEMO DATA</span>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="utility-bar">
            <div className="desktop-breadcrumb">
              Student companion
              <Icon name="chevron" size={13} />
              <strong>{currentTitle}</strong>
            </div>
            <Link className="mobile-brand" href={home}>
              ISC<span>Connect</span>
              <i />
            </Link>
            <div className="role-switcher">
              <span>Signed in as {roleLabel[viewer.role]}</span>
              <div>
                <SignOutButton />
              </div>
            </div>
            <div className="user-profile">
              <span className="avatar">{initials(viewer.name)}</span>
              <div>
                <strong>{viewer.name}</strong>
                <span>{student ? "International student" : roleLabel[viewer.role]}</span>
              </div>
            </div>
          </header>
          <div className="mobile-context">
            <span>{currentTitle}</span>
            {student && (
              <button onClick={() => router.push("/welfare")}>
                <Icon name="shield" size={14} />
                Welfare support
                <Icon name="arrow" size={14} />
              </button>
            )}
          </div>
          {offline && (
            <div className="offline-banner">
              <Icon name="info" size={16} />
              You’re offline. Saved pages still open; changes and official links need a connection.
            </div>
          )}
          <main id="main-content" ref={contentRef} tabIndex={-1} className="main-content">
            {children}
          </main>
          <footer className="main-footer">
            <p>Made for your journey. Run by your International Student Club.</p>
            <div>
              <span>© 2026 ISC · UTM</span>
              <button onClick={() => setModal("about")}>
                About this platform
                <Icon name="external" size={11} />
              </button>
              <button onClick={() => setModal("privacy")}>Privacy & care</button>
              <button className="mobile-install" onClick={installApp}>
                <Icon name="download" size={12} />
                {isInstalled ? "App installed" : "Install app"}
              </button>
            </div>
          </footer>
        </div>
        <nav className="bottom-nav" aria-label="Mobile navigation">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.href}
              className={isActive(item.href) ? "active" : ""}
              onClick={() => router.push(item.href)}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.short}</span>
            </button>
          ))}
        </nav>
        {toast && (
          <div className="toast" role="status">
            <span className="toast-check">
              <Icon name="check" size={17} />
            </span>
            <p>{toast}</p>
            <button onClick={() => setToast("")} aria-label="Dismiss notification">
              <Icon name="close" size={17} />
            </button>
          </div>
        )}
        {modal && (
          <Modal title={modal === "install" ? "Your student companion, on hand." : (page?.title ?? "One moment")} onClose={() => setModal(null)}>
            {modal !== "install" && !page && <p className="modal-body">Loading…</p>}
            {modal !== "install" && page && (
              <div className="modal-body">
                <Icon name={modal === "privacy" ? "shield" : modal === "contact" ? "mail" : "globe"} size={30} />
                <h3>{page.heading}</h3>
                <RichText text={page.body} />
                {modal === "contact" && buddyEmail && (
                  <p>
                    Your buddy’s email: <strong>{buddyEmail}</strong>.
                  </p>
                )}
                {page.linkUrl && (
                  <a
                    className={modal === "contact" ? "button navy" : "text-link"}
                    href={page.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {page.linkLabel}
                    <Icon name="external" size={16} />
                  </a>
                )}
                {modal === "contact" && (
                  <>
                    <hr />
                    <TextLink href="/welfare" onClick={() => setModal(null)}>
                      Open confidential welfare support
                    </TextLink>
                  </>
                )}
              </div>
            )}
            {modal === "install" && (
              <div className="modal-body">
                <Icon name="download" size={30} />
                <h3>{isInstalled ? "You’re already set." : "Keep your campus companion close."}</h3>
                <p>
                  {isInstalled
                    ? "ISC Connect is running as an installed app."
                    : "Open the published app in your browser to install it. Installation may not be available inside an embedded preview."}
                </p>
                <ol className="install-steps">
                  <li>
                    <strong>iPhone / iPad:</strong> In Safari, tap Share, then “Add to Home Screen”.
                  </li>
                  <li>
                    <strong>Android:</strong> In Chrome, open the menu and choose “Install app” or
                    “Add to Home screen”.
                  </li>
                  <li>
                    <strong>Desktop:</strong> Use the install icon in the browser address bar when
                    available.
                  </li>
                </ol>
                <div className="info-banner">
                  <Icon name="info" size={18} />
                  <p>
                    The app, fonts and campus companion photo are available offline after the first
                    successful load. Official links and saving changes need a connection.
                  </p>
                </div>
              </div>
            )}
          </Modal>
        )}
      </div>
    </ShellContext>
  );
}
