package com.fanghaoming.lianke;

import java.io.*;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;

public class AssetStoreTest {
    static final String[] PATHS = {"index.html", "assets/app.js", "assets/app.css"};
    static int passed;
    static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    static void write(File file, String content) throws Exception {
        file.getParentFile().mkdirs();
        Files.write(file.toPath(), content.getBytes(StandardCharsets.UTF_8));
    }
    static void stage(AssetStore store, String version) throws Exception {
        for (String path : PATHS) write(store.stagingFile(version, path), version + ":" + path);
    }
    interface Case { void run(AssetStore store, File base) throws Exception; }
    static void test(String name, Case run) throws Exception {
        File base = Files.createTempDirectory("lianke-assets-test-").toFile();
        try {
            run.run(new AssetStore(base), base);
            passed++;
            System.out.println("PASS " + name);
        } finally { remove(base); }
    }
    static void remove(File file) {
        File[] children = file.listFiles();
        if (children != null) for (File child : children) remove(child);
        file.delete();
    }
    static void fails(Case run, AssetStore store, File base) throws Exception {
        try { run.run(store, base); } catch (IOException expected) { return; }
        throw new AssertionError("Expected rejection");
    }
    public static void main(String[] args) throws Exception {
        if (args.length > 0) {
            AssetStore store = new AssetStore(new File(args[1]));
            switch (args[0]) {
                case "version": System.out.println(store.version()); return;
                case "startup": System.out.println(store.startupDirectory()); return;
                case "activate": store.activate(args[2], java.util.Arrays.copyOfRange(args,3,args.length)); return;
                default: throw new IllegalArgumentException("Unknown command");
            }
        }
        test("first launch falls back to bundled resources", (s,b) -> check(s.startupDirectory() == null, "must use APK"));
        test("download does not change startup version until commit", (s,b) -> {
            stage(s,"v1"); check(s.startupDirectory() == null, "staging must not be served");
            s.activate("v1", PATHS);
            check(new AssetStore(b).startupDirectory().equals(new File(b,"current")), "restart must select current");
        });
        test("missing CSS cannot replace a working version", (s,b) -> {
            stage(s,"v1"); s.activate("v1",PATHS);
            write(s.stagingFile("v2","index.html"),"v2");
            fails((x,y) -> x.activate("v2",PATHS),s,b);
            check(s.version().equals("v1"), "marker must remain v1");
        });
        test("zero-byte asset cannot activate", (s,b) -> {
            stage(s,"v1"); write(s.stagingFile("v1","assets/app.css"),"");
            fails((x,y) -> x.activate("v1",PATHS),s,b);
            check(s.startupDirectory() == null,"must not activate");
        });
        test("current directory switches atomically to the newest version", (s,b) -> {
            stage(s,"v1"); s.activate("v1",PATHS);
            stage(s,"v2"); s.activate("v2",PATHS);
            File current = new AssetStore(b).startupDirectory();
            check(current.getName().equals("current"),"restart did not switch current");
            check(Files.readString(new File(current,"assets/app.css").toPath()).startsWith("v2:"),"current CSS is stale");
        });
        test("interrupted pending marker does not change committed version", (s,b) -> {
            stage(s,"v1"); s.activate("v1",PATHS); write(new File(b,"pending-version"),"v2");
            check(new AssetStore(b).startupDirectory().getName().equals("current"),"pending leaked");
        });
        test("truncated installed CSS rejects startup selection", (s,b) -> {
            stage(s,"v1"); s.activate("v1",PATHS); write(new File(s.startupDirectory(),"assets/app.css"),"x");
            check(s.startupDirectory() == null,"corruption not detected");
        });
        test("path traversal and invalid versions are rejected", (s,b) -> {
            fails((x,y) -> x.stagingFile("v1","../../outside"),s,b);
            fails((x,y) -> x.stagingFile("../bad","index.html"),s,b);
        });
        test("same-length corruption is detected by digest", (s,b) -> {
            stage(s,"v1"); s.activate("v1",PATHS);
            File css = new File(s.startupDirectory(),"assets/app.css");
            write(css, "x".repeat((int)css.length()));
            check(s.startupDirectory() == null,"same-size corrupt CSS accepted");
        });
        test("unverified legacy marker is not reported as installed", (s,b) -> {
            write(new File(b,"current-version"),"v1"); write(new File(b,"current/index.html"),"legacy");
            check(s.startupDirectory() == null,"legacy bypassed validation");
        });
        System.out.println(passed + " native filesystem tests passed");
    }
}
