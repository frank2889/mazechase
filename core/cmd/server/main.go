package main

import (
	"github.com/frank2889/mazechase/cmd"
	"github.com/frank2889/mazechase/internal/config"
	"github.com/frank2889/mazechase/pkg"
)

func main() {
	pkg.ConsoleLogger()
	config.Load()
	pkg.FileConsoleLogger(config.Opts.LogFilePath)

	path := "dist"
	cmd.StartServer(path)
}
