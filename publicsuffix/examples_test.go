package publicsuffix_test

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/urixen-org/primox/dns"
	"github.com/urixen-org/primox/publicsuffix"
)

func ExampleLookup() {
	// Lookup the organizational domain for sub.example.org.
	orgDom := publicsuffix.Lookup(context.Background(), slog.Default(), dns.Domain{ASCII: "sub.example.org"})
	fmt.Println(orgDom)
	// Output: example.org
}
