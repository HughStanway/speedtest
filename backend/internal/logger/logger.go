package logger

import (
	"fmt"
	"os"
	"strings"
	"time"
)

type Level string

const (
	INFO  Level = "INFO"
	WARN  Level = "WARN"
	ERROR Level = "ERROR"
)

// Log prints a structured log message in the format:
// [2026-05-10 20:01:39] [INFO] [component] msg key=value ...
func Log(level Level, component string, msg string, kv ...interface{}) {
	timestamp := time.Now().Format("2006-01-02 15:04:05")
	
	pairs := ""
	if len(kv) > 0 {
		var p []string
		for i := 0; i < len(kv); i += 2 {
			if i+1 < len(kv) {
				p = append(p, fmt.Sprintf("%v=%v", kv[i], kv[i+1]))
			} else {
				p = append(p, fmt.Sprintf("%v=?", kv[i]))
			}
		}
		pairs = " " + strings.Join(p, " ")
	}

	fmt.Fprintf(os.Stdout, "[%s] [%s] [%s] %s%s\n", timestamp, level, component, msg, pairs)
}

func Info(component string, msg string, kv ...interface{}) {
	Log(INFO, component, msg, kv...)
}

func Warn(component string, msg string, kv ...interface{}) {
	Log(WARN, component, msg, kv...)
}

func Error(component string, msg string, kv ...interface{}) {
	Log(ERROR, component, msg, kv...)
}
