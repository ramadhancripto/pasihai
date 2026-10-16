package com.pasihai.app.mesh;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Tiny HTTP/1.1 server. Responses come from JS via PasihaiMeshPlugin — no invented content.
 */
public class MeshHttpServer {
    public interface Handler {
        void onRequest(String requestId, String method, String path, Map<String, String> headers, String body);
    }

    public static class Pending {
        final CountDownLatch latch = new CountDownLatch(1);
        int status = 504;
        String contentType = "application/json";
        byte[] body = "{\"error\":\"timeout\"}".getBytes(StandardCharsets.UTF_8);
    }

    private final int port;
    private final Handler handler;
    private volatile boolean running;
    private volatile boolean allowAllLan = true;
    private final java.util.Set<String> allowedHosts = java.util.concurrent.ConcurrentHashMap.newKeySet();
    private ServerSocket server;
    private ExecutorService pool;
    private final ConcurrentHashMap<String, Pending> pending = new ConcurrentHashMap<>();

    public MeshHttpServer(int port, Handler handler) {
        this.port = port;
        this.handler = handler;
    }

    public void start() throws IOException {
        if (running) return;
        server = new ServerSocket();
        server.setReuseAddress(true);
        server.bind(new InetSocketAddress(port));
        running = true;
        pool = Executors.newCachedThreadPool();
        pool.execute(this::acceptLoop);
    }

    public void stop() {
        running = false;
        try {
            if (server != null) server.close();
        } catch (IOException ignored) {}
        if (pool != null) pool.shutdownNow();
        pending.clear();
    }

    public boolean isRunning() {
        return running;
    }

    public void setAllowAllLan(boolean allow) {
        this.allowAllLan = allow;
    }

    public void setAllowedHosts(java.util.Collection<String> hosts) {
        allowedHosts.clear();
        if (hosts != null) allowedHosts.addAll(hosts);
    }

    public void complete(String requestId, int status, String contentType, byte[] body) {
        Pending p = pending.get(requestId);
        if (p == null) return;
        p.status = status;
        if (contentType != null) p.contentType = contentType;
        if (body != null) p.body = body;
        p.latch.countDown();
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket s = server.accept();
                pool.execute(() -> handleSocket(s));
            } catch (IOException e) {
                if (running) {
                    // keep listening
                }
            }
        }
    }

    private void handleSocket(Socket socket) {
        try (Socket s = socket) {
            java.net.InetAddress remote = s.getInetAddress();
            String ip = remote == null ? "" : remote.getHostAddress();
            if (!allowAllLan && (ip == null || !allowedHosts.contains(ip))) {
                try {
                    OutputStream denied = new BufferedOutputStream(s.getOutputStream());
                    write(denied, 403, "application/json", "{\"error\":\"peer_not_allowed\"}".getBytes(StandardCharsets.UTF_8));
                } catch (Exception ignored) {}
                return;
            }
            s.setSoTimeout(15000);
            InputStream in = new BufferedInputStream(s.getInputStream());
            OutputStream out = new BufferedOutputStream(s.getOutputStream());
            String requestLine = readLine(in);
            if (requestLine == null || requestLine.isEmpty()) return;
            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                write(out, 400, "application/json", "{\"error\":\"bad_request\"}".getBytes(StandardCharsets.UTF_8));
                return;
            }
            String method = parts[0];
            String path = parts[1];
            Map<String, String> headers = new HashMap<>();
            String line;
            int contentLength = 0;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                int c = line.indexOf(':');
                if (c > 0) {
                    String k = line.substring(0, c).trim().toLowerCase(Locale.US);
                    String v = line.substring(c + 1).trim();
                    headers.put(k, v);
                    if ("content-length".equals(k)) {
                        try {
                            contentLength = Integer.parseInt(v);
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
            String body = "";
            if (contentLength > 0 && contentLength < 1_000_000) {
                byte[] buf = new byte[contentLength];
                int off = 0;
                while (off < contentLength) {
                    int n = in.read(buf, off, contentLength - off);
                    if (n < 0) break;
                    off += n;
                }
                body = new String(buf, 0, off, StandardCharsets.UTF_8);
            }
            String id = UUID.randomUUID().toString();
            Pending p = new Pending();
            pending.put(id, p);
            handler.onRequest(id, method, path, headers, body);
            boolean ok = p.latch.await(12, TimeUnit.SECONDS);
            pending.remove(id);
            if (!ok) {
                write(out, 504, "application/json", "{\"error\":\"timeout\"}".getBytes(StandardCharsets.UTF_8));
            } else {
                write(out, p.status, p.contentType, p.body);
            }
        } catch (Exception ignored) {
        }
    }

    private static String readLine(InputStream in) throws IOException {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int prev = -1;
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') {
                break;
            }
            if (prev == '\r') b.write(prev);
            if (c != '\r') b.write(c);
            prev = c;
            if (b.size() > 8192) break;
        }
        if (c == -1 && b.size() == 0) return null;
        return b.toString(StandardCharsets.UTF_8.name());
    }

    private static void write(OutputStream out, int status, String type, byte[] body) throws IOException {
        if (body == null) body = new byte[0];
        String reason = status == 200 ? "OK" : "ERR";
        String head = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Connection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
    }
}
