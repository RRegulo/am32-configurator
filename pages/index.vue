<template>
  <div>
    <div>
      <div class="p-4 max-w-[1400px] mx-auto pb-16">
        <div class="flex flex-col gap-4">
          <UCard>
            <UContainer>
              <h1 class="text-3xl font-bold mb-4">
                AM32 MultiRotor ESC Firmware
              </h1>
              <p class="text-lg mb-8">
                Specialized firmware for speed controllers, designed for
                multirotor enthusiasts.
              </p>

              <div class="mb-8">
                <h2 class="text-2xl font-bold mb-4">
                  Key Features
                </h2>
                <ul class="list-disc list-inside">
                  <li class="mb-2">
                    Firmware Upgradeability: Seamless updates via Betaflight passthrough.
                  </li>
                  <li class="mb-2">
                    Motor Protocol Support: Compatible with Servo PWM and Dshot (300, 600) motor protocols.
                  </li>
                  <li class="mb-2">
                    Bi-directional Dshot: Enhance control and telemetry with bidirectional communication support.
                  </li>
                  <li class="mb-2">
                    Telemetry Support: Betaflight ESC telemetry, KISS standard ESC telemetry.
                  </li>
                  <li class="mb-2">
                    Variable PWM Frequency: Customize PWM frequency for precise motor control.
                  </li>
                  <li class="mb-2">
                    Sinusoidal Startup Mode: Smooth acceleration for larger motors.
                  </li>
                </ul>
              </div>

              <div class="mb-8">
                <h2 class="text-2xl font-bold mb-4">
                  Firmware Release & Configuration
                </h2>
                <p class="mb-4">
                  Stay updated with the latest firmware releases and configure settings using the
                  Multi_ESC config tool and Betaflight passthrough. Alternatively, use the Online-ESC Configurator for
                  web-based flashing and configuration adjustments.
                </p>
                <p class="mb-4">
                  Visit the <a
                    href="https://github.com/RRegulo/esc-firmware/releases"
                    target="_blank"
                    external
                    class="underline text-red-400"
                  >latest release</a> for firmware updates.
                </p>
              </div>

              <div class="mb-8">
                <h2 class="text-2xl font-bold mb-4">
                  Support & Community
                </h2>
                <p class="mb-4">
                  Join our Telegram channel for support and community interaction.
                </p>
                <UButton
                  to="https://t.me/ReguloRnd"
                  target="_blank"
                  icon="i-mdi-telegram"
                  variant="outline"
                  color="blue"
                >
                  Telegram
                </UButton>
              </div>

              <div class="">
                <h2 class="text-2xl font-bold mb-4">
                  Contributors
                </h2>
                <p class="">
                  A big thanks to all contributors, developers, and pilots who have contributed time,
                  advice, and code to the AM32 project.
                </p>
              </div>
            </UContainer>
          </UCard>
        </div>
      </div>
    </div>
  </div>
</template>
