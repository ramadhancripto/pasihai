package com.pasihai.app.mesh;

import android.util.Base64;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Raw TCP HTTP/1.1 client for LAN mesh (not WebView fetch).
 * Does not use HttpURLConnection so internet HTTPS stack stays separate.
 */
public class MeshHttpClient {
    public static class Result {
        public int status;
        public String contentType;
        public byte[] body;
    }

    public static Result request(String url, String method, Map<String, String> headers, byte[] body, boolean binary)
            throws Exception {
        ParsedUrl u = parse(url);
        if (!"http".equals(u.scheme)) {
            throw new IllegalArgumentException("lan_http_only");
        }
        if (u.port < 17432 || u.port > 17440) {
            throw new IllegalArgumentException("port_not_mesh");
        }
        java.net.InetAddress dest = resolveLan(u.host);
        Socket socket = new Socket();
        socket.connect(new InetSocketAddress(dest, u.port), 8000);
        socket.setSoTimeout(15000);
        java.net.InetAddress peer = socket.getInetAddress();
        if (peer == null || !isLanIp(peer)) {
            try { socket.close(); } catch (Exception ignored) {}
            throw new IllegalArgumentException("peer_not_lan");
        }
        try {
            OutputStream out = new BufferedOutputStream(socket.getOutputStream());
            InputStream in = new BufferedInputStream(socket.getInputStream());
            byte[] payload = body == null ? new byte[0] : body;
            StringBuilder req = new StringBuilder();
            req.append(method).append(' ').append(u.path).append(" HTTP/1.1\r\n");
            req.append("Host: ").append(u.host).append(':').append(u.port).append("\r\n");
            req.append("Connection: close\r\n");
            req.append("Content-Length: ").append(payload.length).append("\r\n");
            if (headers != null) {
                for (Map.Entry<String, String> e : headers.entrySet()) {
                    if ("content-length".equalsIgnoreCase(e.getKey()) || "host".equalsIgnoreCase(e.getKey())) continue;
                    req.append(e.getKey()).append(": ").append(e.getValue()).append("\r\n");
                }
            }
            req.append("\r\n");
            out.write(req.toString().getBytes(StandardCharsets.US_ASCII));
            if (payload.length > 0) out.write(payload);
            out.flush();

            String statusLine = readLine(in);
            if (statusLine == null) throw new IOQuiet("empty_response");
            int status = parseStatus(statusLine);
            Map<String, String> rh = new HashMap<>();
            String line;
            int contentLength = -1;
            while ((line = readLine(in)) != null && !line.isEmpty()) {
                int c = line.indexOf(':');
                if (c > 0) {
                    String k = line.substring(0, c).trim().toLowerCase(Locale.US);
                    String v = line.substring(c + 1).trim();
                    rh.put(k, v);
                    if ("content-length".equals(k)) {
                        try { contentLength = Integer.parseInt(v); } catch (NumberFormatException ignored) {}
                    }
                }
            }
            byte[] data;
            if (contentLength >= 0) {
                data = readExact(in, contentLength);
            } else {
                data = readAll(in);
            }
            Result r = new Result();
            r.status = status;
            r.contentType = rh.get("content-type");
            r.body = data;
            return r;
        } finally {
            try { socket.close(); } catch (Exception ignored) {}
        }
    }

    public static String b64(byte[] b) {
        return Base64.encodeToString(b, Base64.NO_WRAP);
    }

    static java.net.InetAddress resolveLan(String host) throws Exception {
        java.net.InetAddress[] addrs = java.net.InetAddress.getAllByName(host);
        java.net.InetAddress lan = null;
        for (java.net.InetAddress a : addrs) {
            if (!isLanIp(a)) {
                throw new IllegalArgumentException("dns_not_lan");
            }
            if (lan == null) lan = a;
        }
        if (lan == null) throw new IllegalArgumentException("not_lan_host");
        return lan;
    }

    static boolean isLanIp(java.net.InetAddress a) {
        if (a == null || a.isAnyLocalAddress() || a.isMulticastAddress() || a.isLinkLocalAddress()) {
            return false;
        }
        if (a.isLoopbackAddress()) return true;
        byte[] b = a.getAddress();
        if (b.length == 4) {
            int x = b[0] & 0xff;
            int y = b[1] & 0xff;
            if (x == 10) return true;
            if (x == 192 && y == 168) return true;
            if (x == 172 && y >= 16 && y <= 31) return true;
        }
        return false;
    }

    private static class ParsedUrl {
        String scheme;
        String host;
        int port;
        String path;
    }

    private static ParsedUrl parse(String url) {
        ParsedUrl u = new ParsedUrl();
        int schemeEnd = url.indexOf("://");
        u.scheme = url.substring(0, schemeEnd);
        String rest = url.substring(schemeEnd + 3);
        int slash = rest.indexOf('/');
        String hostPort = slash < 0 ? rest : rest.substring(0, slash);
        u.path = slash < 0 ? "/" : rest.substring(slash);
        int colon = hostPort.lastIndexOf(':');
        if (colon > 0) {
            u.host = hostPort.substring(0, colon);
            u.port = Integer.parseInt(hostPort.substring(colon + 1));
        } else {
            u.host = hostPort;
            u.port = 80;
        }
        return u;
    }

    private static int parseStatus(String statusLine) {
        String[] p = statusLine.split(" ");
        if (p.length < 2) return 0;
        try { return Integer.parseInt(p[1]); } catch (NumberFormatException e) { return 0; }
    }

    private static String readLine(InputStream in) throws Exception {
        ByteArrayOutputStream b = new ByteArrayOutputStream();
        int c;
        while ((c = in.read()) != -1) {
            if (c == '\n') break;
            if (c != '\r') b.write(c);
            if (b.size() > 8192) break;
        }
        if (c == -1 && b.size() == 0) return null;
        return b.toString(StandardCharsets.UTF_8.name());
    }

    private static byte[] readExact(InputStream in, int n) throws Exception {
        byte[] buf = new byte[n];
        int off = 0;
        while (off < n) {
            int r = in.read(buf, off, n - off);
            if (r < 0) break;
            off += r;
        }
        if (off == n) return buf;
        byte[] cut = new byte[off];
        System.arraycopy(buf, 0, cut, 0, off);
        return cut;
    }

    private static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) >= 0) o.write(buf, 0, n);
        return o.toByteArray();
    }

    private static class IOQuiet extends Exception {
        IOQuiet(String m) { super(m); }
    }
}
