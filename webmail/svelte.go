package webmail

import (
	"io/fs"
	"net/http"

	"github.com/urixen-org/primox/mox-"
	webuiwebmail "github.com/urixen-org/primox/webui/webmail"
)

// svelteHandler serves the webmail SvelteKit SPA embedded in the binary. It is
// always set, so the webmail UI is the Svelte app.
var svelteHandler http.Handler

func init() {
	sub, err := fs.Sub(webuiwebmail.Build, "build")
	if err != nil {
		panic(err)
	}
	svelteHandler = &mox.WebappStatic{FS: sub, CustomStem: "webmail"}
}
