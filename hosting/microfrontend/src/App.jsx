import { useEffect, useMemo, useRef, useState } from "react"
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom"

/**
 * Host contract:
 * - window.__BUDIBASE_APP_URL__ must be an absolute URL.
 * - Path must be /app/<workspace> or /app-chat/<workspace>.
 */
const parseConfiguredBudibaseUrl = () => {
  const raw = window.__BUDIBASE_APP_URL__
  if (!raw || typeof raw !== "string") {
    throw new Error(
      "window.__BUDIBASE_APP_URL__ is required and must be an absolute URL."
    )
  }

  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(
      "window.__BUDIBASE_APP_URL__ must be an absolute URL (e.g. https://app.company.com/app/my-workspace)."
    )
  }

  const appPath = parsed.pathname.replace(/\/$/, "")
  if (!appPath.startsWith("/app/") && !appPath.startsWith("/app-chat/")) {
    throw new Error(
      "window.__BUDIBASE_APP_URL__ path must start with /app/ or /app-chat/."
    )
  }

  return {
    appUrl: parsed.toString(),
    appPath,
  }
}

const normalizePath = path => {
  if (!path) {
    return "/"
  }
  const [pathname = "/", query = ""] = path.split("?")
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`
  return query ? `${normalizedPathname}?${query}` : normalizedPathname
}

const toHash = routePath => {
  const normalized = normalizePath(routePath)
  return normalized === "/" ? "" : `#${normalized}`
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
  const [status, setStatus] = useState("Loading client bundle...")

  // Budibase internal route is hash-based (e.g. #/employees)
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
        const resolvedApp = await resolvePublishedApp(appPath)
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
        setStatus("Failed to load Budibase app via appPackage")
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

  return (
    <div className="mf-shell">
      <header className="mf-header">
        <h1>Budibase Host Shell</h1>
        <p>Status: {status}</p>
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
          element={<BudibaseRoute appUrl={config.appUrl} appPath={config.appPath} />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
