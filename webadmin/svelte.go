package webadmin

import (
	"io/fs"
	"net/http"

	"github.com/mjl-/mox/mox-"
	webuiadmin "github.com/mjl-/mox/webui/admin"
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
