package mox

import (
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

func TestWebappStatic(t *testing.T) {
	mfs := fstest.MapFS{
		"index.html": &fstest.MapFile{Data: []byte("<!doctype html>app")},
		"_app/x.js":  &fstest.MapFile{Data: []byte("console.log(1)")},
	}
	h := &WebappStatic{FS: mfs}

	check := func(method, p string, wantStatus int, wantBody string) {
		t.Helper()
		r := httptest.NewRequest(method, p, nil)
		rw := httptest.NewRecorder()
		h.ServeHTTP(rw, r)
		if rw.Code != wantStatus {
			t.Fatalf("%s %s: got status %d, want %d", method, p, rw.Code, wantStatus)
		}
		if wantBody != "" && rw.Body.String() != wantBody {
			t.Fatalf("%s %s: got body %q, want %q", method, p, rw.Body.String(), wantBody)
		}
	}

	// Root and client routes fall back to the app shell.
	check("GET", "/", 200, "<!doctype html>app")
	check("GET", "/password", 200, "<!doctype html>app")
	check("GET", "/loginattempts", 200, "<!doctype html>app")
	// Existing assets are served directly.
	check("GET", "/_app/x.js", 200, "console.log(1)")
	// Only GET/HEAD are allowed.
	check("POST", "/", 405, "")

	// The fallback gets a no-cache header, hashed assets are immutable.
	r := httptest.NewRequest("GET", "/", nil)
	rw := httptest.NewRecorder()
	h.ServeHTTP(rw, r)
	if cc := rw.Header().Get("Cache-Control"); cc != "no-cache" {
		t.Fatalf("fallback cache-control: got %q", cc)
	}
	r = httptest.NewRequest("GET", "/_app/x.js", nil)
	rw = httptest.NewRecorder()
	h.ServeHTTP(rw, r)
	if cc := rw.Header().Get("Cache-Control"); cc != "public, max-age=31536000, immutable" {
		t.Fatalf("asset cache-control: got %q", cc)
	}

	// Path traversal cannot escape the fs; it falls back instead.
	check("GET", "/../secret", 200, "<!doctype html>app")
}
