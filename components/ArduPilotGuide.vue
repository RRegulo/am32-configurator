<template>
  <div>
    <UButton
      label="Гайд: подключение через ArduPilot"
      icon="i-material-symbols-menu-book-outline"
      color="amber"
      variant="soft"
      size="sm"
      @click="open = true"
    />

    <UModal v-model="open" :ui="{ width: 'w-full sm:max-w-3xl' }">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-center gap-2 text-xl">
            <UIcon name="i-material-symbols-menu-book-outline" class="h-8 w-8" />
            <div class="text-2xl">
              ArduPilot: подключение ESC-конфигуратора
            </div>
          </div>
        </template>

        <div class="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1 text-sm">
          <p class="text-gray-400">
            Конфигуратор не видит ESC напрямую — он отправляет команды через полётник
            (режим <span class="font-bold">MSP-passthrough</span> по USB). Чтобы это заработало,
            в ArduPilot нужно назначить моторы и включить DShot. Ниже — пошаговая настройка.
            Проверено на ArduCopter 4.8.0-dev и ArduPlane 4.7.1; стабильный passthrough —
            с ArduPilot ≥ 4.6.3 (лучше 4.7.x).
          </p>

          <UAlert
            color="green"
            variant="soft"
            icon="i-material-symbols-check-circle-outline"
            title="Проверено"
            description="Прошивка 4.7.1, SpeedyBee F405 WING: конфигуратор подключается, прошивка и конфигурация заливаются, телеметрия работает."
          />

          <section class="flex flex-col gap-2">
            <div class="text-base font-bold">
              Где менять параметры
            </div>
            <ul class="list-disc list-inside flex flex-col gap-1 text-gray-300">
              <li>
                <span class="font-bold">Mission Planner:</span> вкладка <span class="font-bold">CONFIG</span>
                → <span class="font-bold">Full Parameter List</span> (или Full Parameter Tree).
                Введи имя параметра в поиск сверху, измени значение и нажми
                <span class="font-bold">Write Params</span>.
              </li>
              <li>
                <span class="font-bold">QGroundControl:</span> Vehicle Setup →
                <span class="font-bold">Parameters</span>, найди параметр по имени и сохрани.
              </li>
              <li>
                После изменения <code class="param">Q_ENABLE</code> или
                <code class="param">SERVOx_FUNCTION</code> обязательно
                <span class="font-bold">перезагрузи полётник</span> (Reboot).
              </li>
            </ul>
          </section>

          <section class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="step">1</span>
              <span class="text-base font-bold">Сброс к дефолтам</span>
            </div>
            <p><code class="param">FORMAT_VERSION=0</code> → Write Params → перезагрузка.</p>
            <p class="text-gray-400">
              <span class="font-bold">Зачем:</span> чистый старт — убирает старые и конфликтующие
              параметры, чтобы дальше настраивать предсказуемо. Внимание: стирает текущие настройки,
              заранее сохрани свой конфиг (Save в Mission Planner).
            </p>
          </section>

          <section class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="step">2</span>
              <span class="text-base font-bold">Включить passthrough</span>
            </div>
            <ul class="flex flex-col gap-1">
              <li><code class="param">SERVO_BLH_AUTO=1</code> — автоматически включать passthrough на выходах с AM32/BLHeli.</li>
              <li><code class="param">SERVO_BLH_PORT=0</code> — через какой порт идёт passthrough; 0 = текущий порт подключения (USB/MAVLink).</li>
            </ul>
            <p class="text-gray-400">
              <span class="font-bold">Зачем:</span> без этого полётник не пустит конфигуратор к ESC.
            </p>
          </section>

          <section class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="step">3</span>
              <span class="text-base font-bold">Дать полётнику моторы (QuadPlane)</span>
            </div>
            <p class="text-gray-400">
              У «чистого» самолёта <span class="font-bold">MOTOR COUNT=0</span>, и passthrough не к
              чему привязаться. Проще всего включить минимальный QuadPlane — тогда появятся 4 мотора.
            </p>
            <ul class="flex flex-col gap-1">
              <li><code class="param">Q_ENABLE=1</code> — включить поддержку QuadPlane.</li>
              <li><code class="param">Q_FRAME_CLASS=1</code> — класс рамы Quad.</li>
              <li><code class="param">Q_FRAME_TYPE=1</code> — тип рамы X.</li>
              <li><code class="param">Q_M_PWM_TYPE=6</code> — выходной сигнал моторов DShot600.</li>
            </ul>
            <p>Перезагрузка → <span class="font-bold">MOTOR COUNT</span> станет 4.</p>
          </section>

          <section class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="step">4</span>
              <span class="text-base font-bold">Привязать моторы к выходам</span>
            </div>
            <ul class="flex flex-col gap-1">
              <li><code class="param">SERVO1_FUNCTION=33</code>, <code class="param">SERVO2_FUNCTION=34</code>, <code class="param">SERVO3_FUNCTION=35</code>, <code class="param">SERVO4_FUNCTION=36</code> — выходы 1–4 = Motor1..4.</li>
              <li><code class="param">SERVO5_FUNCTION=0</code> … <code class="param">SERVO8_FUNCTION=0</code> — остальные выходы не моторы.</li>
              <li><code class="param">SERVO_BLH_MASK=15</code> — маска каналов 1–4 (0b1111) для BLHeli/AM32.</li>
              <li><code class="param">SERVO_BLH_OTYPE=6</code> — тип выходного сигнала DShot600.</li>
            </ul>
            <p>Перезагрузка.</p>
            <p class="text-gray-400">
              <span class="font-bold">Зачем:</span> ArduPilot должен точно знать, на каких выходах
              моторы и какие из них отдавать в passthrough.
            </p>
          </section>

          <section class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="step">5</span>
              <span class="text-base font-bold">Телеметрия и питание</span>
            </div>
            <ul class="flex flex-col gap-1">
              <li><span class="font-bold">SERIAL1 (UART1):</span> <code class="param">SERIAL1_PROTOCOL=16</code> (ESC telemetry), <code class="param">SERIAL1_BAUD=115</code> (115200).</li>
              <li><span class="font-bold">SERIAL4 (UART4):</span> <code class="param">SERIAL4_PROTOCOL=23</code> (CRSF), <code class="param">SERIAL4_BAUD=420</code> (420000).</li>
              <li><code class="param">BATT_MONITOR=9</code> — напряжение и ток из ESC-телеметрии.</li>
            </ul>
            <p class="text-gray-400">
              <span class="font-bold">Зачем:</span> UART1 — линия телеметрии ESC, UART4 — приёмник CRSF.
              Номера UART зависят от платы — сверься с распиновкой.
            </p>
          </section>

          <section class="flex flex-col gap-3">
            <div class="flex items-center gap-2">
              <span class="step">6</span>
              <span class="text-base font-bold">Подключение</span>
            </div>
            <ul class="list-disc list-inside flex flex-col gap-1">
              <li>USB-кабель — <span class="font-bold">не</span> телеметрийный радиомодем.</li>
              <li>Аппарат разармлен, пропеллеры сняты.</li>
              <li>GCS (Mission Planner / QGroundControl) отключён.</li>
              <li>В конфигураторе выбери COM-порт полётника и нажми Connect.</li>
            </ul>
          </section>

          <div class="rounded-lg bg-gray-800/60 p-3">
            <span class="font-bold">Итог:</span> 4 мотора на выходах 1–4, DShot600,
            SERVO_BLH_AUTO=1 + SERVO_BLH_MASK=15, ESC-телеметрия на UART1, CRSF на UART4 →
            ребут → MOTOR COUNT=4 → конфигуратор подключается.
          </div>
        </div>

        <template #footer>
          <div class="text-right">
            <UButton color="gray" variant="ghost" label="Закрыть" @click="open = false" />
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
    autoOpen?: boolean
}>(), {
    autoOpen: false
});

const open = ref(false);

onMounted(() => {
    if (props.autoOpen) {
        open.value = true;
    }
});
</script>

<style scoped>
.param {
    border-radius: 0.25rem;
    background-color: rgb(31 41 55 / 0.8);
    padding: 0.1rem 0.35rem;
    color: rgb(252 211 77);
    white-space: nowrap;
}

.step {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.5rem;
    width: 1.5rem;
    flex-shrink: 0;
    border-radius: 9999px;
    background-color: rgb(245 158 11 / 0.2);
    color: rgb(251 191 36);
    font-weight: 700;
}
</style>
