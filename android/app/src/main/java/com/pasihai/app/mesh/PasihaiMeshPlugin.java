package com.pasihai.app.mesh;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.content.Context;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;

/**
 * LAN NSD discovery + HTTP transfer. Does not invent peers.
 * BLE/Wi-Fi Direct bulk transfer is NOT implemented.
 * Discovery/server run while the plugin is started — not a guaranteed background mesh.
 */
@CapacitorPlugin(name = "PasihaiMesh")
public class PasihaiMeshPlugin extends Plugin {

    private MeshHttpServer http;
    private NsdMeshDiscovery nsd;
    private String deviceId = "unknown";
    private int port = 17432;
    private WifiManager.MulticastLock multicastLock;

    @PluginMethod
    public void getCapabilities(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("plugin", true);
        ret.put("protocol", "pasihai-mesh/1");
        boolean bt = false;
        try {
            BluetoothAdapter adapter = getAdapter();
            bt = adapter != null && adapter.isEnabled();
        } catch (Exception ignored) {
            bt = false;
        }
        ret.put("bluetooth", bt);
        ret.put("bluetoothTransferImplemented", false);
        ret.put("wifiDirect", false);
        ret.put("wifiDirectTransferImplemented", false);
        ret.put("lanNsd", true);
        ret.put("lanHttpTransferImplemented", true);
        ret.put("transferImplemented", true);
        ret.put("backgroundGuaranteed", false);
        ret.put("serverRunning", http != null && http.isRunning());
        ret.put("discovering", nsd != null && nsd.isDiscovering());
        call.resolve(ret);
    }

    @PluginMethod
    public void startTransport(PluginCall call) {
        deviceId = call.getString("deviceId", UUID.randomUUID().toString());
        port = call.getInt("port", 17432);
        try {
            acquireMulticast();
            if (http == null || !http.isRunning()) {
                Exception last = null;
                int[] ports = new int[] { port, 17433, 17434, 17435, 17436 };
                boolean bound = false;
                for (int p : ports) {
                    try {
                        http = new MeshHttpServer(p, this::emitHttp);
                        http.start();
                        port = p;
                        bound = true;
                        last = null;
                        break;
                    } catch (Exception ex) {
                        last = ex;
                        http = null;
                    }
                }
                if (!bound) throw last != null ? last : new Exception("bind_failed");
            }
            if (nsd == null) nsd = new NsdMeshDiscovery(getContext(), deviceId);
            Boolean disc = call.getBoolean("discoverable");
            boolean discoverable = disc == null || disc;
            if (discoverable) {
                nsd.register(port);
                nsd.startDiscovery();
            }
            if (http != null) http.setAllowAllLan(discoverable);
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("deviceId", deviceId);
            ret.put("port", port);
            ret.put("discoverable", discoverable);
            ret.put("backgroundGuaranteed", false);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("reason", e.getMessage() != null ? e.getMessage() : "start_failed");
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void setDiscoverable(PluginCall call) {
        Boolean disc = call.getBoolean("discoverable");
        boolean discoverable = disc != null && disc;
        if (nsd == null) {
            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("discoverable", false);
            ret.put("reason", "transport_not_started");
            call.resolve(ret);
            return;
        }
        if (discoverable) {
            nsd.register(port);
            nsd.startDiscovery();
        } else {
            nsd.stop();
        }
        if (http != null) http.setAllowAllLan(discoverable);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("discoverable", discoverable);
        ret.put("httpRunning", http != null && http.isRunning());
        ret.put("allowAllLan", discoverable);
        call.resolve(ret);
    }

    @PluginMethod
    public void setAllowedPeers(PluginCall call) {
        if (http == null) {
            call.reject("server_not_running");
            return;
        }
        JSArray arr = call.getArray("hosts");
        java.util.List<String> hosts = new java.util.ArrayList<>();
        if (arr != null) {
            for (int i = 0; i < arr.length(); i++) {
                try {
                    hosts.add(arr.getString(i));
                } catch (Exception ignored) {}
            }
        }
        http.setAllowedHosts(hosts);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        ret.put("count", hosts.size());
        call.resolve(ret);
    }

    @PluginMethod
    public void stopTransport(PluginCall call) {
        if (nsd != null) nsd.stop();
        if (http != null) http.stop();
        releaseMulticast();
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void listPeers(PluginCall call) {
        JSObject ret = new JSObject();
        if (nsd == null || !nsd.isDiscovering()) {
            ret.put("peers", new JSArray());
            ret.put("reason", "discovery_idle");
            ret.put("available", false);
            call.resolve(ret);
            return;
        }
        try {
            JSONObject o = nsd.listJson();
            ret = JSObject.fromJSONObject(o);
            ret.put("available", true);
            call.resolve(ret);
        } catch (Exception e) {
            ret.put("peers", new JSArray());
            ret.put("reason", "list_error");
            ret.put("available", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void respondHttp(PluginCall call) {
        if (http == null) {
            call.reject("server_not_running");
            return;
        }
        String id = call.getString("requestId");
        int status = call.getInt("status", 500);
        String type = call.getString("contentType", "application/json");
        String b64 = call.getString("bodyB64");
        String body = call.getString("body", "");
        byte[] bytes;
        if (b64 != null && !b64.isEmpty()) {
            bytes = Base64.decode(b64, Base64.DEFAULT);
        } else {
            bytes = body.getBytes(StandardCharsets.UTF_8);
        }
        http.complete(id, status, type, bytes);
        JSObject ret = new JSObject();
        ret.put("ok", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void httpRequest(PluginCall call) {
        String url = call.getString("url");
        String method = call.getString("method", "GET");
        if (url == null || url.isEmpty()) {
            call.reject("url_required");
            return;
        }
        if (!(url.startsWith("http://") || url.startsWith("https://"))) {
            call.reject("bad_url");
            return;
        }
        new Thread(() -> {
            try {
                JSObject headersObj = call.getObject("headers");
                Map<String, String> headers = new HashMap<>();
                if (headersObj != null) {
                    Iterator<String> keys = headersObj.keys();
                    while (keys.hasNext()) {
                        String k = keys.next();
                        headers.put(k, headersObj.getString(k));
                    }
                }
                String bodyStr = call.getString("body");
                byte[] body = bodyStr == null ? null : bodyStr.getBytes(StandardCharsets.UTF_8);
                Boolean binFlag = call.getBoolean("binary");
                boolean binary = binFlag != null && binFlag;
                MeshHttpClient.Result r = MeshHttpClient.request(url, method, headers, body, binary);
                JSObject ret = new JSObject();
                ret.put("status", r.status);
                ret.put("contentType", r.contentType == null ? "" : r.contentType);
                boolean asBin = binary || (r.contentType != null && r.contentType.contains("octet-stream"));
                if (asBin) {
                    ret.put("bodyB64", MeshHttpClient.b64(r.body));
                    ret.put("body", "");
                } else {
                    ret.put("body", new String(r.body, StandardCharsets.UTF_8));
                }
                call.resolve(ret);
            } catch (Exception e) {
                call.reject(e.getMessage() != null ? e.getMessage() : "http_error");
            }
        }).start();
    }

    private void emitHttp(String requestId, String method, String path, Map<String, String> headers, String body) {
        JSObject ev = new JSObject();
        ev.put("requestId", requestId);
        ev.put("method", method);
        ev.put("path", path);
        ev.put("body", body == null ? "" : body);
        JSObject h = new JSObject();
        if (headers != null) {
            for (Map.Entry<String, String> e : headers.entrySet()) {
                h.put(e.getKey(), e.getValue());
            }
        }
        ev.put("headers", h);
        notifyListeners("meshHttp", ev);
    }

    private BluetoothAdapter getAdapter() {
        Context ctx = getContext();
        if (ctx == null) return null;
        BluetoothManager mgr = (BluetoothManager) ctx.getSystemService(Context.BLUETOOTH_SERVICE);
        if (mgr == null) return null;
        return mgr.getAdapter();
    }

    private void acquireMulticast() {
        try {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi == null) return;
            multicastLock = wifi.createMulticastLock("pasihai-nsd");
            multicastLock.setReferenceCounted(false);
            multicastLock.acquire();
        } catch (Exception ignored) {}
    }

    private void releaseMulticast() {
        try {
            if (multicastLock != null && multicastLock.isHeld()) multicastLock.release();
        } catch (Exception ignored) {}
        multicastLock = null;
    }

    @Override
    protected void handleOnDestroy() {
        if (nsd != null) nsd.stop();
        if (http != null) http.stop();
        releaseMulticast();
        super.handleOnDestroy();
    }
}
