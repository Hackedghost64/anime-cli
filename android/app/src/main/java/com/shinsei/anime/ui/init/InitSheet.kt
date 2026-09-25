package com.shinsei.anime.ui.init

import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Code
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.QrCodeScanner
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.shinsei.anime.ShinseiApp
import com.shinsei.anime.data.local.AppPreferences
import com.shinsei.anime.data.sync.SyncClient
import com.shinsei.anime.ui.sync.CameraXScannerView
import com.shinsei.anime.ui.theme.BackgroundBlack
import com.shinsei.anime.ui.theme.CrunchyOrange
import com.shinsei.anime.ui.theme.LiveGreen
import com.shinsei.anime.ui.theme.SurfaceBorder
import com.shinsei.anime.ui.theme.SurfaceDark
import com.shinsei.anime.ui.theme.SurfaceElevated
import com.shinsei.anime.ui.theme.TextMuted
import com.shinsei.anime.ui.theme.TextPrimary
import com.shinsei.anime.ui.theme.TextSecondary
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InitSheet(
    onDismiss: () -> Unit,
    onInitialized: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    val preferences = remember { AppPreferences(context) }
    val scriptRunner = ShinseiApp.instance.scriptRunner
    val syncClient = remember { SyncClient(context) }

    val defaultHost = if (preferences.lastSyncHost.isNotEmpty()) preferences.lastSyncHost else "192.168.1.100"
    var scriptUrl by remember { mutableStateOf("http://$defaultHost:8088/provider.bundle.js") }
    var isLoading by remember { mutableStateOf(false) }
    var statusMessage by remember { mutableStateOf<String?>(null) }
    var isSuccess by remember { mutableStateOf(false) }
    var showCameraScanner by remember { mutableStateOf(false) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = SurfaceDark,
        scrimColor = BackgroundBlack.copy(alpha = 0.8f)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    imageVector = Icons.Default.Code,
                    contentDescription = null,
                    tint = CrunchyOrange,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "RUNNER SCRIPT INITIALIZER",
                    color = TextPrimary,
                    fontWeight = FontWeight.Black,
                    fontSize = 16.sp,
                    letterSpacing = 1.sp
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            Text(
                text = "Point the engine to a cloud/local script URL, scan a QR code from 'anime-cli init' or 'anime-cli -s', or reload the bundled JS.",
                color = TextSecondary,
                fontSize = 12.sp,
                textAlign = TextAlign.Center,
                lineHeight = 16.sp,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.height(18.dp))

            // Status Card
            if (statusMessage != null) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = SurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(
                        1.dp,
                        if (isSuccess) LiveGreen else Color.Red
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 16.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(14.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isSuccess) Icons.Default.CheckCircle else Icons.Default.ErrorOutline,
                            contentDescription = null,
                            tint = if (isSuccess) LiveGreen else Color.Red,
                            modifier = Modifier.size(22.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Text(
                            text = statusMessage ?: "",
                            color = TextPrimary,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            if (isLoading) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(120.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        CircularProgressIndicator(color = CrunchyOrange, modifier = Modifier.size(36.dp))
                        Spacer(modifier = Modifier.height(12.dp))
                        Text("Fetching & Injecting Script...", color = TextSecondary, fontSize = 13.sp)
                    }
                }
            } else if (showCameraScanner) {
                // Embedded Camera Scanner for anime-cli init / sync
                Box(
                    modifier = Modifier
                        .fillMaxWidth(0.85f)
                        .aspectRatio(1f)
                        .clip(RoundedCornerShape(16.dp))
                        .border(2.dp, CrunchyOrange, RoundedCornerShape(16.dp))
                ) {
                    CameraXScannerView(
                        onBarcodeScanned = { payload ->
                            if (!isLoading) {
                                isLoading = true
                                showCameraScanner = false
                                coroutineScope.launch {
                                    if (payload.startsWith("http")) {
                                        val ok = scriptRunner.updateScriptFromUrl(payload)
                                        isLoading = false
                                        if (ok) {
                                            preferences.isInitialized = true
                                            isSuccess = true
                                            statusMessage = "✓ Script loaded from QR URL!"
                                            Toast.makeText(context, "✓ Script initialized!", Toast.LENGTH_SHORT).show()
                                            onInitialized()
                                        } else {
                                            isSuccess = false
                                            statusMessage = "Failed to fetch script from QR URL"
                                        }
                                    } else {
                                        val res = syncClient.performSync(payload)
                                        isLoading = false
                                        if (res.success) {
                                            preferences.isInitialized = true
                                            isSuccess = true
                                            statusMessage = "✓ Script loaded & synced from PC!"
                                            Toast.makeText(context, "✓ Initialized!", Toast.LENGTH_SHORT).show()
                                            onInitialized()
                                        } else {
                                            isSuccess = false
                                            statusMessage = res.message
                                        }
                                    }
                                }
                            }
                        }
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = { showCameraScanner = false },
                    colors = ButtonDefaults.buttonColors(containerColor = SurfaceBorder)
                ) {
                    Text("Close Scanner", color = TextPrimary)
                }
            } else {
                // Section 1: URL Input
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = SurfaceElevated,
                    border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(
                            text = "CLOUD OR LOCAL SCRIPT URL",
                            color = TextPrimary,
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        OutlinedTextField(
                            value = scriptUrl,
                            onValueChange = { scriptUrl = it },
                            placeholder = { Text("http://192.168.1.X:8088/provider.bundle.js", color = TextMuted, fontSize = 13.sp) },
                            singleLine = true,
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = CrunchyOrange,
                                unfocusedBorderColor = SurfaceBorder,
                                focusedTextColor = TextPrimary,
                                unfocusedTextColor = TextPrimary
                            ),
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = {
                                if (scriptUrl.isNotBlank()) {
                                    isLoading = true
                                    coroutineScope.launch {
                                        val ok = scriptRunner.updateScriptFromUrl(scriptUrl.trim())
                                        isLoading = false
                                        if (ok) {
                                            preferences.isInitialized = true
                                            isSuccess = true
                                            statusMessage = "✓ Script loaded and active!"
                                            Toast.makeText(context, "✓ Script initialized!", Toast.LENGTH_SHORT).show()
                                            onInitialized()
                                        } else {
                                            isSuccess = false
                                            statusMessage = "Failed to download script from URL. Check IP and port."
                                        }
                                    }
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = CrunchyOrange),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.Default.CloudDownload,
                                contentDescription = null,
                                tint = Color.Black,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = "FETCH & INITIALIZE SCRIPT",
                                color = Color.Black,
                                fontWeight = FontWeight.Bold,
                                fontSize = 13.sp
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Section 2: Action Buttons
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    // Scan QR Button
                    OutlinedButton(
                        onClick = { showCameraScanner = true },
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, CrunchyOrange),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = Icons.Default.QrCodeScanner,
                            contentDescription = null,
                            tint = CrunchyOrange,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("SCAN QR", color = CrunchyOrange, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    }

                    // Reset to Bundled Script
                    OutlinedButton(
                        onClick = {
                            scriptRunner.resetScriptToBundled()
                            preferences.isInitialized = true
                            isSuccess = true
                            statusMessage = "✓ Engine reset to bundled script."
                            Toast.makeText(context, "✓ Loaded bundled engine", Toast.LENGTH_SHORT).show()
                            onInitialized()
                        },
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, SurfaceBorder),
                        modifier = Modifier.weight(1f)
                    ) {
                        Icon(
                            imageVector = Icons.Default.RestartAlt,
                            contentDescription = null,
                            tint = TextSecondary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("BUNDLED", color = TextSecondary, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}
