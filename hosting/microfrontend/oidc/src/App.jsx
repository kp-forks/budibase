import { useEffect, useMemo, useRef, useState } from "react"
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom"

const parseConfiguredBudibaseUrl = () => {
  const raw = window.__BUDIBASE_APP_URL__
  if (!raw || typeof raw !== "string") {
    throw new Error(
      "window.__BUDIBASE_APP_URL__ is required and must be an absolute URL."
    )
  }

  const parsed = new URL(raw)
  if (parsed.origin !== window.location.origin) {
    throw new Error(
      "window.__BUDIBASE_APP_URL__ must use the same origin as the host shell."
    )
  }

  const appPath = parsed.pathname.replace(/\/$/, "")
  if (!appPath.startsWith("/app/") && !appPath.startsWith("/app-chat/")) {
    throw new Error(
      "window.__BUDIBASE_APP_URL__ path must start with /app/ or /app-chat/."
    )
  }

  return { appUrl: parsed.toString(), appPath }
}

const normalizePath = path => {
  if (!path) {
    return "/"
  }
  const [pathname = "/", query = ""] = path.split("?")
  const normalizedPathname = pathname.startsWith("/")
    ? pathname
    : `/${pathname}`
  return query ? `${normalizedPathname}?${query}` : normalizedPathname
}

const toHash = routePath => {
  const normalized = normalizePath(routePath)
  return normalized === "/" ? "" : `#${normalized}`
}

const buildReturnTo = appPath => {
  const fallback = appPath || "/"
  if (window.location.pathname.startsWith("/auth/")) {
    return `${fallback}${window.location.hash || ""}`
  }
  return `${window.location.pathname}${window.location.search}${window.location.hash}`
}

const checkSessionState = async () => {
  const bffSession = await fetch("/auth/session", {
    credentials: "same-origin",
  })

  const hasOidcSession = bffSession.ok
  const budibaseSession = await fetch("/api/global/self", {
    credentials: "same-origin",
  })
  const hasBudibaseSession = budibaseSession.ok
  return { hasOidcSession, hasBudibaseSession }
}

const resolveAppIdFromPublishedPage = async appPath => {
  const response = await fetch(`/_bb${appPath}`, {
    credentials: "same-origin",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch published app page for path: ${appPath}`)
  }

  const html = await response.text()
  const appIdMatch = html.match(
    /window\["##BUDIBASE_APP_ID##"\]\s*=\s*"([^"]+)"/
  )
  return appIdMatch?.[1]
}

const resolvePublishedApp = async appPath => {
  const appId = await resolveAppIdFromPublishedPage(appPath)
  if (!appId) {
    throw new Error(`Could not resolve Budibase app for path: ${appPath}`)
  }
  return { appId, appPath }
}

const resolveClientLibPath = async ({ appId, appPath }) => {
  const response = await fetch(`/api/applications/${appId}/appPackage`, {
    credentials: "same-origin",
    headers: {
      "x-budibase-embed-location": appPath,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to fetch app package")
  }

  const appPackage = await response.json()
  if (!appPackage?.clientLibPath) {
    throw new Error("App package did not include clientLibPath")
  }

  return appPackage.clientLibPath
}

const BudibaseRoute = ({ appUrl, appPath }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const targetRef = useRef(null)
  const mountHandleRef = useRef(null)
  const currentHostUrlRef = useRef(`${location.pathname}${location.hash || ""}`)
  const [status, setStatus] = useState("Checking session...")
  const [isOidcAuthenticated, setIsOidcAuthenticated] = useState(false)
  const [isBudibaseAuthenticated, setIsBudibaseAuthenticated] = useState(false)

  const initialBudibaseRoute = useMemo(() => {
    const rawHashPath = location.hash.startsWith("#")
      ? location.hash.slice(1)
      : ""
    return normalizePath(rawHashPath || "/")
  }, [location.hash])

  currentHostUrlRef.current = `${location.pathname}${location.hash || ""}`

  useEffect(() => {
    let isMounted = true

    const mountRemote = async () => {
      try {
        const sessionState = await checkSessionState()
        if (!isMounted) {
          return
        }
        setIsOidcAuthenticated(sessionState.hasOidcSession)
        setIsBudibaseAuthenticated(sessionState.hasBudibaseSession)
        if (!sessionState.hasOidcSession) {
          setStatus("Not logged in. Click Login to authenticate.")
        } else if (!sessionState.hasBudibaseSession) {
          setStatus("OIDC active. Click Login to bridge Budibase session.")
        } else {
          setStatus("Authenticated. Loading Budibase app...")
        }

        setStatus("Loading Budibase app metadata...")
        const resolvedApp = await resolvePublishedApp(appPath)

        setStatus("Loading Budibase client bundle...")
        const clientLibPath = await resolveClientLibPath(resolvedApp)
        const remote = await import(/* @vite-ignore */ clientLibPath)

        if (!isMounted) {
          return
        }

        if (typeof remote.mountBudibaseApp !== "function") {
          setStatus("Client bundle loaded, but mountBudibaseApp was not found")
          return
        }

        const handle = await remote.mountBudibaseApp({
          target: targetRef.current,
          appUrl,
          appId: resolvedApp.appId,
          initialPath: initialBudibaseRoute,
          onNavigate: nextPath => {
            const targetHash = toHash(nextPath)
            const nextHostUrl = `${appPath}${targetHash}`

            if (nextHostUrl !== currentHostUrlRef.current) {
              navigate(
                {
                  pathname: appPath,
                  hash: targetHash,
                },
                { replace: true }
              )
            }
          },
        })

        if (!isMounted) {
          handle?.()
          return
        }

        mountHandleRef.current = handle
        setStatus("Budibase app mounted")
      } catch (error) {
        console.error(error)
        setStatus("Failed to load Budibase app")
      }
    }

    mountRemote()

    return () => {
      isMounted = false
      if (typeof mountHandleRef.current === "function") {
        mountHandleRef.current()
      }
      mountHandleRef.current = null
    }
  }, [appPath, appUrl, navigate])

  useEffect(() => {
    const handle = mountHandleRef.current
    if (!handle?.navigate) {
      return
    }

    const currentRemotePath = handle.getCurrentPath?.()
    if (currentRemotePath === initialBudibaseRoute) {
      return
    }

    handle.navigate(initialBudibaseRoute)
  }, [initialBudibaseRoute])

  const login = () => {
    const returnTo = buildReturnTo(appPath)
    window.location.assign(
      `/auth/login?returnTo=${encodeURIComponent(returnTo)}&bridgeBudibase=1`
    )
  }

  const logout = async () => {
    const returnTo = buildReturnTo(appPath)
    window.location.assign(
      `/auth/logout?returnTo=${encodeURIComponent(returnTo)}`
    )
  }

  return (
    <div className="mf-shell">
      <header className="mf-header">
        <div className="mf-header-row">
          <div>
            <h1>Budibase Host Shell</h1>
            <p>Status: {status}</p>
          </div>
          <div className="mf-header-actions">
            {isOidcAuthenticated && isBudibaseAuthenticated ? (
              <button
                type="button"
                className="mf-login-button"
                onClick={logout}
              >
                Logout
              </button>
            ) : (
              <button type="button" className="mf-login-button" onClick={login}>
                Login
              </button>
            )}
          </div>
        </div>
      </header>
      <main className="mf-canvas">
        <div ref={targetRef} className="mf-budibase-target" />
      </main>
    </div>
  )
}

const App = () => {
  const config = useMemo(() => parseConfiguredBudibaseUrl(), [])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="*"
          element={
            <BudibaseRoute appUrl={config.appUrl} appPath={config.appPath} />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
