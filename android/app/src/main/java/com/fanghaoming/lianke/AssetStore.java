package com.fanghaoming.lianke;

import java.io.*;
import java.nio.charset.StandardCharsets;

/** Filesystem transaction shared by the Android plugin and local JVM tests. */
public final class AssetStore {
    public static final String DIRECTORY_NAME = "lianke-assets";
    private final File base;
    public AssetStore(File base) { this.base = base; }

    private void checkVersion(String version) throws IOException {
        if (!version.matches("[a-zA-Z0-9_-]+")) throw new IOException("Invalid version");
    }

    public File stagingFile(String version, String path) throws IOException {
        checkVersion(version);
        File root = new File(base, "staging/" + version);
        File file = new File(root, path);
        if (!file.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator))
            throw new IOException("Invalid asset path");
        return file;
    }

    public String version() throws IOException {
        File marker = new File(base, "current-version");
        if (!marker.isFile()) return "";
        try (InputStream in = new FileInputStream(marker); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[256];
            int count;
            while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
            String value = new String(out.toByteArray(), StandardCharsets.UTF_8).trim();
            checkVersion(value);
            return value;
        }
    }

    public File startupDirectory() throws IOException {
        String version = version();
        if (version.isEmpty()) return null;
        File root = new File(base, "current");
        return complete(root) ? root : null;
    }

    public synchronized void prepareForAppVersion(String appVersion) throws IOException {
        checkVersion(appVersion);
        File marker = new File(base, "app-version");
        String previous = "";
        if (marker.isFile()) {
            try (InputStream in = new FileInputStream(marker)) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                byte[] buffer = new byte[128];
                int count;
                while ((count = in.read(buffer)) != -1) out.write(buffer, 0, count);
                previous = new String(out.toByteArray(), StandardCharsets.UTF_8).trim();
            }
        }
        if (!appVersion.equals(previous)) {
            deleteTree(new File(base, "current"));
            deleteTree(new File(base, "staging"));
            try (FileOutputStream out = new FileOutputStream(marker)) {
                out.write(appVersion.getBytes(StandardCharsets.UTF_8));
                out.getFD().sync();
            }
            File markerVersion = new File(base, "current-version");
            if (markerVersion.exists() && !markerVersion.delete()) throw new IOException("Cannot reset current version");
        }
    }

    private void deleteTree(File file) throws IOException {
        if (!file.exists()) return;
        if (file.isDirectory()) {
            File[] children = file.listFiles();
            if (children != null) for (File child : children) deleteTree(child);
        }
        if (!file.delete()) throw new IOException("Cannot delete " + file);
    }

    private boolean complete(File root) {
        try (DataInputStream in = new DataInputStream(new FileInputStream(new File(root, ".complete")))) {
            int count = in.readInt();
            if (count < 1 || count > 10000) return false;
            for (int i = 0; i < count; i++) {
                File file = new File(root, in.readUTF());
                long size = in.readLong();
                String hash = in.readUTF();
                if (!file.getCanonicalPath().startsWith(root.getCanonicalPath() + File.separator)
                    || !file.isFile() || size <= 0 || file.length() != size || !digest(file).equals(hash)) return false;
            }
            return new File(root, "index.html").isFile();
        } catch (IOException error) { return false; }
    }

    private String digest(File file) throws IOException {
        try (InputStream input = new FileInputStream(file)) {
            java.security.MessageDigest hash = java.security.MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) hash.update(buffer, 0, count);
            StringBuilder value = new StringBuilder();
            for (byte item : hash.digest()) value.append(String.format("%02x", item & 255));
            return value.toString();
        } catch (java.security.NoSuchAlgorithmException error) { throw new IOException(error); }
    }

    public synchronized void activate(String version, String[] paths) throws IOException {
        checkVersion(version);
        if (paths.length == 0) throw new IOException("Empty asset list");
        File staging = new File(base, "staging/" + version);
        for (String path : paths) {
            File file = stagingFile(version, path);
            if (!file.isFile() || file.length() == 0) throw new IOException("Missing asset: " + path);
        }
        if (!new File(staging, "index.html").isFile()) throw new IOException("Missing entry document");
        try (DataOutputStream out = new DataOutputStream(new FileOutputStream(new File(staging, ".complete")))) {
            out.writeInt(paths.length);
            for (String path : paths) {
                File file = stagingFile(version, path);
                out.writeUTF(path); out.writeLong(file.length()); out.writeUTF(digest(file));
            }
        }
        File target = new File(base, "current");
        File backup = new File(base, "current-previous");
        if (backup.exists()) deleteTree(backup);
        if (target.exists() && !target.renameTo(backup)) throw new IOException("Cannot stage current assets");
        if (!target.getParentFile().isDirectory() && !target.getParentFile().mkdirs()) throw new IOException("Cannot create asset directory");
        if (!staging.renameTo(target)) {
            if (backup.exists()) backup.renameTo(target);
            throw new IOException("Cannot publish assets");
        }
        if (backup.exists()) deleteTree(backup);
        File pending = new File(base, "pending-version");
        try (FileOutputStream out = new FileOutputStream(pending)) {
            out.write(version.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        }
        if (!pending.renameTo(new File(base, "current-version"))) throw new IOException("Cannot commit version");
    }
}
