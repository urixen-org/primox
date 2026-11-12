package webadmin

import (
	"io/fs"
	"net/http"

	"github.com/urixen-org/primox/mox-"
	webuiadmin "github.com/urixen-org/primox/webui/admin"
)

// svelteHandler serves the admin SvelteKit SPA embedded in the binary.
var svelteHandler http.Handler

func init() {
	sub, err := fs.Sub(webuiadmin.Build, "build")
	if err != nil {
		panic(err)
	}
	svelteHandler = &mox.WebappStatic{FS: sub, CustomStem: "webadmin"}
}
