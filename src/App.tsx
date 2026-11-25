import { useCallback, useEffect, useState } from 'react';
import { AdminLogin } from './components/admin/AdminLogin.tsx';
import { AdminShell } from './components/admin/AdminShell.tsx';
import { PublicLayout } from './components/public/PublicLayout.tsx';
import { PublicSite } from './components/public/PublicSite.tsx';
import { apiFetch, getAuthToken } from './lib/api.ts';
import type { PublicBootstrapData } from './types.ts';

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => normalizePath(window.location.pathname));
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('preview') === 'true';
  });
  const [hasSession, setHasSession] = useState<boolean>(() => Boolean(getAuthToken()));

  const [publicData, setPublicData] = useState<PublicBootstrapData | null>(null);
  const [loadingPublic, setLoadingPublic] = useState<boolean>(true);
  const [publicError, setPublicError] = useState<string>('');

  const navigate = useCallback((targetPath: string, preview = false) => {
    const clean = normalizePath(targetPath);
    const url = preview ? `${clean}?preview=true` : clean;
    window.history.pushState({}, '', url);
    setCurrentPath(clean);
    setIsPreviewMode(preview);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    const onPop = () => {
      setCurrentPath(normalizePath(window.location.pathname));
      const params = new URLSearchParams(window.location.search);
      setIsPreviewMode(params.get('preview') === 'true');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const loadPublicData = useCallback(async (preview: boolean) => {
    setLoadingPublic(true);
    setPublicError('');
    try {
      const endpoint = preview ? '/api/public/bootstrap?preview=true' : '/api/public/bootstrap';
      const data = await apiFetch<PublicBootstrapData>(endpoint);
      setPublicData(data);
    } catch (err) {
      setPublicError(err instanceof Error ? err.message : 'Unable to load website content.');
    } finally {
      setLoadingPublic(false);
    }
  }, []);

  useEffect(() => {
    if (!currentPath.startsWith('/admin')) {
      loadPublicData(isPreviewMode);
    }
  }, [currentPath, isPreviewMode, loadPublicData]);

  // Protected Admin Routes
  if (currentPath === '/admin/login') {
    return (
      <AdminLogin
        onAuthenticated={() => {
          setHasSession(true);
          navigate('/admin');
        }}
        onBackToSite={() => navigate('/')}
      />
    );
  }

  if (currentPath === '/admin' || currentPath.startsWith('/admin/')) {
    if (!hasSession || !getAuthToken()) {
      return (
        <AdminLogin
          onAuthenticated={() => {
            setHasSession(true);
            navigate('/admin');
          }}
          onBackToSite={() => navigate('/')}
        />
      );
    }

    return (
      <AdminShell
        onLoggedOut={() => {
          setHasSession(false);
          navigate('/admin/login');
        }}
        onNavigatePublic={(path, preview = false) => navigate(path, preview)}
      />
    );
  }

  // Public Website
  if (loadingPublic && !publicData) {
    return (
      <div className="min-h-screen bg-[#FAF5EE] flex items-center justify-center text-sm text-[#4A0E36]">
        Loading BraidsofHope...
      </div>
    );
  }

  if (publicError || !publicData) {
    return (
      <div className="min-h-screen bg-[#FAF5EE] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-[#4A0E36]">BraidsofHope</h1>
        <p className="text-sm text-stone-600">{publicError || 'Website data could not be loaded.'}</p>
        <button
          type="button"
          onClick={() => loadPublicData(isPreviewMode)}
          className="px-5 py-2 rounded-full bg-[#4A0E36] text-white text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <PublicLayout data={publicData} currentPath={currentPath} onNavigate={(p) => navigate(p, isPreviewMode)}>
      <PublicSite data={publicData} currentPath={currentPath} onNavigate={(p) => navigate(p, isPreviewMode)} />
    </PublicLayout>
  );
}
