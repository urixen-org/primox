package mox

import (
	"bytes"
	"io/fs"
	"net/http"
	"path"
	"strings"
	"time"
)

// WebappStatic serves a static web app (typically a SPA built with SvelteKit and
// adapter-static) from an fs.FS. Requests that do not resolve to a file are
// answered with the fallback file (index.html by default), so client-side
// routing works for deep links like /account/password.
//
// Hashed build assets are served with a long, immutable cache lifetime, while
// the fallback (the app shell) is not cached, so new deployments are picked up.
//
// The handler is mounted with http.StripPrefix(basePath) by the caller, so it
// sees paths relative to the app root (e.g. "/_app/..." and "/password"). It is
// therefore independent of the mount path.
type WebappStatic struct {
	FS       fs.FS
	Fallback string // defaults to "index.html"
}

func (w *WebappStatic) fallback() string {
	if w.Fallback == "" {
		return "index.html"
	}
	return w.Fallback
}

func (w *WebappStatic) ServeHTTP(rw http.ResponseWriter, r *http.Request) {
	if r.Method != "GET" && r.Method != "HEAD" {
		http.Error(rw, "405 - method not allowed - use get", http.StatusMethodNotAllowed)
		return
	}

	// Clean the path and strip the leading slash so it cannot escape the fs.
	name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if name != "" && name != "." {
		if st, err := fs.Stat(w.FS, name); err == nil && !st.IsDir() {
			w.serve(rw, r, name, false)
			return
		}
	}

	fb := w.fallback()
	if _, err := fs.Stat(w.FS, fb); err != nil {
		http.NotFound(rw, r)
		return
	}
	w.serve(rw, r, fb, true)
}

func (w *WebappStatic) serve(rw http.ResponseWriter, r *http.Request, name string, isFallback bool) {
	data, err := fs.ReadFile(w.FS, name)
	if err != nil {
		http.Error(rw, "500 - internal server error", http.StatusInternalServerError)
		return
	}
	var mtime time.Time
	if st, err := fs.Stat(w.FS, name); err == nil {
		mtime = st.ModTime()
	}
	if isFallback {
		rw.Header().Set("Cache-Control", "no-cache")
	} else {
		rw.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
	}
	http.ServeContent(rw, r, name, mtime, bytes.NewReader(data))
}
