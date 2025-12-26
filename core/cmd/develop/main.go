package main

import (
	"os"

	"github.com/frank2889/mazechase/cmd"
	"github.com/frank2889/mazechase/internal/config"
	"github.com/frank2889/mazechase/pkg"
)

func main() {
	_ = os.Setenv("MP_DISABLE_AUTH", "true")

	pkg.ConsoleLogger()
	config.Load()
	pkg.FileConsoleLogger(config.Opts.LogFilePath)

	path := "../ui-web/dist"
	cmd.StartServer(path)
}
