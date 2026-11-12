package webaccount

import (
	"io/fs"
	"net/http"

	"github.com/mjl-/mox/mox-"
	webuiaccount "github.com/mjl-/mox/webui/account"
)

// svelteHandler serves the SvelteKit SPA embedded in the binary. It is always
// set, so the account UI is the Svelte app.
var svelteHandler http.Handler

func init() {
	sub, err := fs.Sub(webuiaccount.Build, "build")
	if err != nil {
		panic(err)
	}
	svelteHandler = &mox.WebappStatic{FS: sub, CustomStem: "webaccount"}
}
