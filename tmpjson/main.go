package main

import (
	"encoding/json"
	"fmt"

	"github.com/urixen-org/primox/webmail"
)

func main() {
	b, err := json.Marshal(webmail.EventViewMsgs{
		ViewID:    1,
		RequestID: 1,
		MessageItems: [][]webmail.MessageItem{
			{{}},
		},
		ViewEnd: true,
	})
	if err != nil {
		panic(err)
	}
	fmt.Println(string(b))
}
