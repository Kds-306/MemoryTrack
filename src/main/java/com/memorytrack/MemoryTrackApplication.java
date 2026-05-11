package com.memorytrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import java.awt.Desktop;
import java.net.URI;

@SpringBootApplication
public class MemoryTrackApplication {

    public static void main(String[] args) {

        SpringApplication.run(MemoryTrackApplication.class, args);

        new Thread(() -> {
            try {
                Thread.sleep(3000);

                // 🔥 FORCE OPEN BROWSER (Windows)
                Runtime.getRuntime().exec("cmd /c start http://localhost:8080");

            } catch (Exception e) {
                e.printStackTrace();
            }
        }).start();
    }
}