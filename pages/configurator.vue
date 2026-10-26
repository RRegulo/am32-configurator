<template>
  <div>
    <div v-if="isArduPilot" class="flex justify-center pt-4">
      <ArduPilotGuide auto-open />
    </div>

    <div>
      <div v-if="!serialStore.hasSerial">
        <div class="text-3x text-red-500">
          WebSerial not supported! Please use other browser!
        </div>
      </div>
      <div v-else-if="escStore.count === 0">
        <div class="text-xl p-6 text-center text-orange-500">
          Please connect to a device and read settings.
        </div>
      </div>
      <div v-else-if="serialStore.isFourWay || serialStore.isDirectConnect" class="pt-4 pb-12 h-full">
        <UTabs
          :items="tabs"
        >
          <template #tune>
            <div class="pt-4 flex flex-col gap-4">
              <div class="flex gap-4 w-full justify-center">
                <div v-for="(info, n) of escStore.escData" :key="n">
                  <EscView
                    :is-loading="info.isLoading"
                    :index="n"
                    :esc="info"
                    :mcu="info.data"
                    @change="onChange"
                    @toggle="onToggle"
                  />
                </div>
              </div>
              <div v-if="escStore.isLoading" class="flex justify-center items-center mt-20">
                <UIcon class="text-green-500 w-[80px] h-[80px]" name="i-svg-spinners-blocks-wave" dynamic />
              </div>
              <div v-else-if="escStore.selectedEscInfo.length > 0" class="flex flex-col gap-4">
                <UCard class="max-w-[900px]">
                  <template #header>
                    <div class="flex items-center gap-2 text-xl">
                      <UIcon name="i-material-symbols-volume-up" class="h-6 w-6" />
                      Звуковые сигналы
                    </div>
                  </template>
                  <div class="flex flex-col gap-3">
                    <div
                      v-for="signal of soundSignals"
                      :key="signal.title"
                      class="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-800 pb-2 last:border-b-0"
                    >
                      <div class="flex items-end gap-[3px] h-6 w-24 shrink-0">
                        <span
                          v-for="(bar, i) of signal.bars"
                          :key="i"
                          class="inline-block w-[6px] rounded-sm"
                          :class="bar === 0 ? 'bg-transparent' : signal.color"
                          :style="{ height: `${bar === 0 ? 2 : bar * 7}px` }"
                        />
                      </div>
                      <div>
                        <div class="font-bold">{{ signal.title }}</div>
                        <div class="text-sm text-gray-400">{{ signal.description }}</div>
                      </div>
                    </div>
                  </div>
                </UCard>
                <UCard class="max-w-[900px]">
                  <template #header>
                    <div class="flex items-center gap-2 text-xl">
                      <UIcon name="i-material-symbols-tune" class="h-6 w-6" />
                      Калибровка газа
                    </div>
                  </template>
                  <ol class="list-decimal list-inside flex flex-col gap-2 text-sm">
                    <li>Подайте питание, удерживая газ на максимуме — ESC свип-сигналом войдёт в режим калибровки.</li>
                    <li>Дождитесь двух нисходящих сигналов — верхняя точка газа зафиксирована.</li>
                    <li>Переведите газ в минимум и держите — после двух восходящих сигналов диапазон будет сохранён в EEPROM.</li>
                    <li>Отключите и подайте питание снова, чтобы выйти из режима калибровки.</li>
                  </ol>
                  <div class="text-sm text-gray-400 mt-3">
                    Калибровка выполняется автоматически при каждом включении, если она не отключена галочкой
                    «Disable stick calibration» в разделе Essentials. Для Servo-сигнала пороги можно донастроить
                    вручную в разделе Servo settings.
                  </div>
                </UCard>
                <UCard class="max-w-[900px]">
                  <template #header>
                    <div class="flex items-center gap-2 text-xl">
                      <UIcon name="i-material-symbols-error-outline" class="h-6 w-6" />
                      Коды ошибок (морзе)
                    </div>
                  </template>
                  <div class="text-sm text-gray-400 mb-3">
                    При ошибке ESC подаёт код из двух цифр азбукой морзе на одной фазе мотора: точка — 60 мс,
                    тире — 180 мс. Код повторяется каждые ~1.5 с, пока ошибка активна и мотор остановлен.
                  </div>
                  <div class="flex flex-col gap-2">
                    <div
                      v-for="error of morseErrors"
                      :key="error.code"
                      class="flex flex-col sm:flex-row sm:items-center gap-2 border-b border-gray-800 pb-2 last:border-b-0"
                    >
                      <div class="flex items-end h-6 w-40 shrink-0">
                        <template v-for="(el, i) of error.elements" :key="i">
                          <span
                            class="inline-block w-[6px] rounded-sm bg-red-500"
                            :style="{ height: el === '-' ? '22px' : '8px' }"
                          />
                          <span
                            class="inline-block"
                            :class="el === ' ' ? 'w-[14px]' : 'w-[5px]'"
                          />
                        </template>
                      </div>
                      <div>
                        <span class="font-bold">Код {{ error.code }}</span>
                        <span class="text-gray-400"> — {{ error.description }}</span>
                      </div>
                    </div>
                  </div>
                </UCard>
              </div>
            </div>
          </template>
          <template #settings>
            <div class="h-full pt-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full justify-center">
                <div v-for="(info, n) of escStore.escData" :key="n">
                  <EscView
                    :is-loading="info.isLoading"
                    :index="n"
                    :esc="info"
                    :mcu="info.data"
                    @change="onChange"
                    @toggle="onToggle"
                  />
                </div>
              </div>
              <div v-if="escStore.isLoading" class="flex justify-center items-center mt-20">
                <UIcon class="text-green-500 w-[80px] h-[80px]" name="i-svg-spinners-blocks-wave" dynamic />
              </div>
              <div v-else-if="escStore.selectedEscInfo.length > 0" class="p-4 max-w-[1400px] m-auto">
                <div class="flex flex-col gap-4 justify-center">
                  <SettingFieldGroup
                    class="w-1/2"
                    title="Essentials"
                    :eeprom-version="layoutVersion"
                    :firmware-version="firmwareVersion"
                    :cols="1"
                    :switches="[
                      {
                        field: 'DISABLE_STICK_CALIBRATION',
                        name: 'Disable stick calibration',
                        help: 'Отключить калибровку диапазона газа по стику при подаче питания (ESC не будет требовать полного газа и звучать при включении).',
                        minFirmwareVersion: 'v2.19'
                      }
                    ]"
                    @change="onSettingsChange"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="ESC_PROTOCOL"
                      name="Protocol"
                      type="select"
                      :options="protocolOptions"
                      placeholder="Select input protocol"
                      help="Протокол входного сигнала. Auto — определять автоматически; DShot — цифровой, надёжный, не требует калибровки; Servo — ШИМ 1000–2000 мкс (стандарт для самолётов); Serial — управление по UART; EDT ARM — протокол EDT с отдельным армированием."
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    title="Motor"
                    :eeprom-version="layoutVersion"
                    :firmware-version="firmwareVersion"
                    :cols="3"
                    :switches="[{
                      field: 'NO_POLLING_START',
                      name: 'No polling start',
                      help: 'Не опрашивать ротор перед стартом: мотор начинает крутиться сразу, без предварительных пульсаций. Полезно, если старт затянут.'
                    }, {
                      field: 'STUCK_ROTOR_PROTECTION',
                      name: 'Stuck rotor protection',
                      help: 'Защита от заклинивания ротора: если мотор не начал крутиться, питание снимается. На старте возможны подёргивания при проверке ротора.'
                    }, {
                      field: 'STALL_PROTECTION',
                      name: 'Stall protection',
                      help: 'Защита от срыва: при перегрузке ESC автоматически поднимает мощность, чтобы мотор не остановился. Осторожно с винтовыми моторами — может маскировать перегрузку.'
                    }, {
                      field: 'INTERVAL_TELEMETRY',
                      name: '30ms interval telemetry',
                      help: 'Отправка телеметрии с фиксированным интервалом 30 мс вместо привязки к кадрам DShot.'
                    }, {
                      field: 'VARIABLE_PWM_FREQUENCY',
                      name: 'Variable PWM',
                      help: 'Переменная частота ШИМ: частота зависит от оборотов мотора — тише работа на низких оборотах.',
                      maxFirmwareVersion: 'v2.17'
                    }, {
                      field: 'COMPLEMENTARY_PWM',
                      name: 'Complementary PWM',
                      help: 'Комплементарный ШИМ: ключи плеча работают в противофазе (синхронное выпрямление) — меньше нагрев, но требует подходящего драйвера. Включайте только если уверены в железе.'
                    }, {
                      field: 'AUTO_ADVANCE',
                      name: 'Auto timing advance',
                      help: 'Автоматическое опережение коммутации: подстраивается по оборотам. Ручная настройка «Timing advance» при этом игнорируется.',
                      minFirmwareVersion: 'v2.16'
                    }]"
                    :radios="[{
                      field: 'VARIABLE_PWM_FREQUENCY',
                      name: 'PWM Type',
                      minFirmwareVersion: 'v2.18',
                      values: [{
                        name: 'Fixed',
                        value: 0
                      }, {
                        name: 'Variable',
                        value: 1
                      }, {
                        name: 'by RPM',
                        value: 2
                      }]
                    }, {
                      field: 'DEMAG_COMPENSATION',
                      name: 'Demag compensation',
                      help: 'Компенсация размагничивания (по схеме Bluejay): при большой нагрузке учитывает задержку перехода через ноль после коммутации и снижает риск срыва (desync). Low — мягче, High — сильнее. Доступно с прошивки 2.4.',
                      minFirmwareVersion: 'v2.4',
                      values: [{
                        name: 'Off',
                        value: 0
                      }, {
                        name: 'Low',
                        value: 1
                      }, {
                        name: 'High',
                        value: 2
                      }]
                    }]"
                    @change="onSettingsChange"
                  >
                    <SettingField
                      v-if="isInEEpromVersion(layoutVersion, 3)"
                      :esc-info="escStore.selectedEscInfo"
                      field="TIMING_ADVANCE"
                      name="Timing advance"
                      type="number"
                      :min="0"
                      :max="32"
                      :step="1"
                      :display-factor="1"
                      :only-display-factor="0.9375"
                      :offset="-10"
                      unit="°"
                      help="Опережение коммутации. Больше опережения — больше мощности на высоких оборотах, но выше ток и нагрев. Если мотор гудит или перегревается — уменьшите. При включённом «Auto timing advance» игнорируется."
                      :disabled="(v: number) => escStore.firstValidEscData?.data.settings.AUTO_ADVANCE === 1"
                      @change="onSettingsChange"
                    />
                    <SettingField
                      v-else
                      :esc-info="escStore.selectedEscInfo"
                      field="TIMING_ADVANCE"
                      name="Timing advance"
                      type="number"
                      :min="0"
                      :max="22.5"
                      :step="7.5"
                      :display-factor="7.5"
                      unit="°"
                      help="Опережение коммутации. Больше опережения — больше мощности на высоких оборотах, но выше ток и нагрев. Если мотор гудит или перегревается — уменьшите. При включённом «Auto timing advance» игнорируется."
                      :disabled="(v: number) => escStore.firstValidEscData?.data.settings.AUTO_ADVANCE === 1"
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="STARTUP_POWER"
                      name="Startup power"
                      type="number"
                      :min="50"
                      :max="150"
                      :step="1"
                      unit="%"
                      help="Мощность при раскрутке с места. Слишком низкая — мотор долго стартует или дёргается; слишком высокая — возможны срывы шагов на старте."
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MOTOR_KV"
                      name="Motor KV"
                      type="number"
                      :min="20"
                      :max="10220"
                      :step="40"
                      :display-factor="40"
                      :offset="20"
                      help="Обороты мотора на вольт без нагрузки (KV). Используется для расчёта оборотов и лимитов RPM. Должно совпадать с паспортом мотора."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MOTOR_POLES"
                      name="Motor poles"
                      type="number"
                      :min="2"
                      :max="36"
                      help="Число полюсов мотора (количество магнитов × 2). Нужно для пересчёта электрических оборотов в механические."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="BEEP_VOLUME"
                      name="Beeper volume"
                      type="number"
                      :min="0"
                      :max="11"
                      help="Громкость звуковых сигналов ESC (0 — тихо)."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="PWM_FREQUENCY"
                      name="PWM Frequency"
                      type="number"
                      :min="8"
                      :max="isInEEpromVersion(layoutVersion, 3) ? 144 : 48"
                      :step="1"
                      unit="kHz"
                      help="Частота ШИМ. Выше — тише и плавнее работа, но выше потери в ключах. Типично 16–48 кГц; для мощных моторов и больших нагрузок высокие частоты нежелательны. При «Variable PWM» задаёт нижнюю границу диапазона."
                      :disabled="(v: number) => (escStore.firstValidEscData?.data.settings.VARIABLE_PWM_FREQUENCY as number ?? 0) > 1"
                      @change="onSettingsChange"
                    >
                      <template #unit="{ value }">
                        <div v-if="escStore.firstValidEscData?.data.settings.VARIABLE_PWM_FREQUENCY === 1">
                          {{ value }}kHz - {{ value as number * 2 }}kHz
                        </div>
                        <div v-else>
                          {{ value }}kHz
                        </div>
                      </template>
                    </SettingField>
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    v-if="isInEEpromVersion(layoutVersion, 3)"
                    title="Extended settings"
                    :cols="3"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MAX_RAMP"
                      name="Ramp rate"
                      type="number"
                      :min=".1"
                      :max="20"
                      :step=".1"
                      unit="% duty cycle per ms"
                      :display-factor=".1"
                      help="Скорость изменения газа (% скважности в мс). Ограничивает разгон мотора, сглаживая рывки. Меньше значение — плавнее, но дольше отклик мотора."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MINIMUM_DUTY_CYCLE"
                      name="Minimum duty cycle"
                      type="number"
                      :min="0"
                      :max="25"
                      :step=".5"
                      unit="%"
                      :display-factor="0.5"
                      help="Минимальная скважность (%): минимальный уровень мощности, при котором мотор держит обороты. Помогает на старте и при минимальном газе."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MAXIMUM_DUTY_CYCLE"
                      name="Maximum duty cycle"
                      type="number"
                      :min="1"
                      :max="100"
                      :step="1"
                      unit="%"
                      help="Максимальный газ (%): ограничивает максимальную скважность. Полный стик всё равно соответствует этому пределу (100% от разрешённого диапазона). 100 = без ограничения."
                      show-value
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    title="Limits"
                    :cols="3"
                    :firmware-version="firmwareVersion"
                    :switches="[{
                      field: 'LOW_VOLTAGE_CUTOFF',
                      name: 'Low voltage cut off',
                      help: 'Отключение при низком напряжении: Off — выключено; «по элементу» — порог считается на банку; «Absolute» — фиксированный порог на всю батарею.',
                      maxFirmwareVersion: 'v2.18'
                    }]"
                    :radios="[{
                      field: 'LOW_VOLTAGE_CUTOFF',
                      name: 'Low voltage cut off',
                      minFirmwareVersion: 'v2.19',
                      values: [{
                        name: 'Off',
                        value: 0
                      }, {
                        name: 'Cell based',
                        value: 1
                      }, {
                        name: 'Absolute',
                        value: 2
                      }]
                    }]"
                    @change="onSettingsChange"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="TEMPERATURE_LIMIT"
                      name="Temperature limit"
                      type="number"
                      :min="70"
                      :max="141"
                      :step="1"
                      :disabled-value="141"
                      help="Лимит температуры: при перегреве ESC снижает мощность. Максимальное значение отключает защиту."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="CURRENT_LIMIT"
                      name="Current limit"
                      type="number"
                      :min="0"
                      :max="202"
                      :step="2"
                      :display-factor="2"
                      :disabled-value="202"
                      help="Лимит тока: при превышении ESC ограничивает мощность. 0 — защита выключена."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      v-if="(escStore.firstValidEscData?.data.settings.LOW_VOLTAGE_CUTOFF as number) < 2"
                      :esc-info="escStore.selectedEscInfo"
                      field="LOW_VOLTAGE_THRESHOLD"
                      name="Low voltage cut off threshold"
                      type="number"
                      :min="250"
                      :max="350"
                      :step="1"
                      :offset="250"
                      :display-factor="1"
                      help="Порог отсечки на элемент (2.50–3.50 В). Действует при включённой отсечке «по элементу». Не ставьте слишком высоко — мотор будет отключаться на пиках нагрузки."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.LOW_VOLTAGE_CUTOFF === 0"
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      v-if="isInEEpromVersion(layoutVersion, 3)
                        && (escStore.firstValidEscData?.data.settings.LOW_VOLTAGE_CUTOFF as number) === 2"
                      :esc-info="escStore.selectedEscInfo"
                      field="ABSOLUTE_VOLTAGE_CUTOFF"
                      name="Absolute voltage cutoff"
                      type="number"
                      :min="1"
                      :max="100"
                      :step="1"
                      :display-factor="0.5"
                      unit="V"
                      help="Абсолютный порог напряжения батареи (В) для отсечки. Действует только в режиме «Absolute»."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.LOW_VOLTAGE_CUTOFF !== 2"
                      show-value
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    v-if="isInEEpromVersion(layoutVersion, 3)"
                    title="Current control"
                    :cols="3"
                    :class="{
                      'before:content-[\'\'] before:absolute before:inset-0 blur-[2px]': (escStore.firstValidEscData?.data.settings.CURRENT_LIMIT as number) > 100
                    }"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="CURRENT_P"
                      name="Current P"
                      type="number"
                      :min="0"
                      :max="255"
                      help="Коэффициент P регулятора тока: скорость реакции на превышение лимита. Слишком высоко — рывки, слишком низко — вялость."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="CURRENT_I"
                      name="Current I"
                      type="number"
                      :min="0"
                      :max="255"
                      help="Коэффициент I регулятора тока: устранение остаточной ошибки. Слишком высоко — колебания тока."
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="CURRENT_D"
                      name="Current D"
                      type="number"
                      :min="0"
                      :max="255"
                      help="Коэффициент D регулятора тока: гашение колебаний при резких изменениях нагрузки."
                      show-value
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    title="Sinusoidal Startup"
                    :cols="2"
                    :switches="[{
                      field: 'SINUSOIDAL_STARTUP',
                      name: 'Sinusoidal startup',
                      help: 'Синусоидальный старт: плавный и тихий запуск мотора. Особенно полезно для крупных моторов и самолётов. Внимание: длительная работа в синусоидальном режиме может вызывать повышенный нагрев мотора и ESC.'
                    }]"
                    @change="onSettingsChange"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="SINE_MODE_RANGE"
                      name="Sine Mode Range"
                      type="number"
                      :min="5"
                      :max="25"
                      help="Диапазон синусоидального режима: обороты, до которых мотор работает в синусоидальном режиме перед переходом на обычную коммутацию."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.SINUSOIDAL_STARTUP === 0 || escStore.firstValidEscData?.data.settings.RC_CAR_REVERSING !== 0"
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="SINE_MODE_POWER"
                      name="Sine Mode Power"
                      type="number"
                      :min="1"
                      :max="10"
                      help="Мощность синусоидального режима: насколько сильно мотор держит момент в синусоидальном режиме."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.SINUSOIDAL_STARTUP === 0 || escStore.firstValidEscData?.data.settings.RC_CAR_REVERSING !== 0"
                      show-value
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    title="Brake"
                    :cols="3"
                    :eeprom-version="layoutVersion"
                    :firmware-version="firmwareVersion"
                    :switches="[{
                      field: 'BRAKE_ON_STOP',
                      name: 'Brake on stop',
                      help: 'Торможение при остановке: Off — без тормоза; «Brake on stop» — удерживать мотор заторможенным после остановки; «Active brake» — активное торможение.',
                      maxFirmwareVersion: 'v2.18'
                    }, {
                      field: 'RC_CAR_REVERSING',
                      name: 'Car type reverse braking',
                      help: 'Режим реверса для машинок: газ вперёд — тормоз — задний ход.'
                    }]"
                    :radios="[{
                      field: 'BRAKE_ON_STOP',
                      name: 'Brake on stop',
                      minFirmwareVersion: 'v2.19',
                      values: [{
                        name: 'Off',
                        value: 0
                      }, {
                        name: 'Brake on stop',
                        value: 1
                      }, {
                        name: 'Active brake',
                        value: 2
                      }]
                    }]"
                    @change="onSettingsChange"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      name="Brake strength"
                      type="number"
                      field="BRAKE_STRENGTH"
                      :min="1"
                      :max="10"
                      :step="1"
                      help="Сила торможения (1–10)."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.BRAKE_ON_STOP === 0 || escStore.firstValidEscData?.data.settings.RC_CAR_REVERSING !== 0"
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      name="Running brake level"
                      type="number"
                      field="RUNNING_BRAKE_LEVEL"
                      :min="1"
                      :max="10"
                      :step="1"
                      help="Уровень торможения на ходу в режиме реверса (1–10)."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.RC_CAR_REVERSING !== 0"
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="ACTIVE_BRAKE_POWER"
                      name="Active brake power"
                      type="number"
                      :min="0"
                      :max="5"
                      :step="1"
                      unit="%"
                      help="Мощность активного торможения (%). 0 — выключено. Работает только при «Active brake»."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.BRAKE_ON_STOP !== 2"
                      @change="onSettingsChange"
                    >
                      <template #unit="{ value }">
                        {{ value === 0 ? 'Off' : `${value} % duty cycle` }}
                      </template>
                    </SettingField>
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="BRAKE_ON_ZERO_THROTTLE"
                      name="Brake on zero throttle"
                      type="select"
                      :options="brakeOnZeroThrottleOptions"
                      help="Поведение при нулевом газе: Off — без тормоза; Coast — свободное выбегание; Motor brake — мотор тормозит при нулевом газе."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.RC_CAR_REVERSING !== 0"
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    title="Servo settings"
                    :cols="3"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      name="Low threshold"
                      type="number"
                      field="SERVO_LOW_THRESHOLD"
                      :min="750"
                      :max="1250"
                      :display-factor="2"
                      :offset="750"
                      help="Нижний порог сигнала Servo (мкс): ниже него мощность считается нулевой."
                      show-value
                      @change="onSettingsChange"
                    />

                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      name="High threshold"
                      type="number"
                      field="SERVO_HIGH_THRESHOLD"
                      :min="1750"
                      :max="2250"
                      :display-factor="2"
                      :offset="1750"
                      help="Верхний порог сигнала Servo (мкс): выше него мощность максимальна."
                      show-value
                      @change="onSettingsChange"
                    />

                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      name="Neutral"
                      type="number"
                      field="SERVO_NEUTRAL"
                      :min="1374"
                      :max="1630"
                      :display-factor="1"
                      :offset="1374"
                      help="Нейтраль газа для протокола Servo (мкс) — положение остановки мотора."
                      show-value
                      @change="onSettingsChange"
                    />

                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      name="Dead band"
                      type="number"
                      field="SERVO_DEAD_BAND"
                      :min="0"
                      :max="100"
                      help="Мёртвая зона вокруг нейтрали (мкс): колебания сигнала внутри зоны не изменяют мощность."
                      show-value
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <SettingFieldGroup
                    v-if="isInEEpromVersion(layoutVersion, 4)"
                    title="RPM control"
                    :cols="2"
                    :switches="[{
                      field: 'DRIVE_BY_RPM',
                      name: 'Drive by RPM',
                      help: 'Управление по оборотам: ESC поддерживает заданные обороты независимо от нагрузки винта (полезно на самолёте при пикировании/наборе высоты).'
                    }]"
                    @change="onSettingsChange"
                  >
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MAXIMUM_RPM"
                      name="Maximum RPM"
                      type="number"
                      :min="200"
                      :max="50000"
                      :step="200"
                      :display-factor="200"
                      help="Максимальные обороты в режиме управления по оборотам."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.DRIVE_BY_RPM !== 1"
                      show-value
                      @change="onSettingsChange"
                    />
                    <SettingField
                      :esc-info="escStore.selectedEscInfo"
                      field="MINIMUM_RPM"
                      name="Minimum RPM"
                      type="number"
                      :min="200"
                      :max="50000"
                      :step="200"
                      :display-factor="200"
                      help="Минимальные обороты в режиме управления по оборотам."
                      :disabled="(value: number) => escStore.firstValidEscData?.data.settings.DRIVE_BY_RPM !== 1"
                      show-value
                      @change="onSettingsChange"
                    />
                  </SettingFieldGroup>
                  <RpmCalculator
                    v-if="escStore.firstValidEscData?.data.settings.DRIVE_BY_RPM === 1"
                    :minimum-rpm="escStore.firstValidEscData?.data.settings.MINIMUM_RPM as number"
                    :maximum-rpm="escStore.firstValidEscData?.data.settings.MAXIMUM_RPM as number"
                    :motor-kv="escStore.firstValidEscData?.data.settings.MOTOR_KV as number"
                    :motor-poles="escStore.firstValidEscData?.data.settings.MOTOR_POLES as number"
                    :drive-by-rpm="escStore.firstValidEscData?.data.settings.DRIVE_BY_RPM as number"
                  />
                </div>
              </div>
            </div>
          </template>
        </UTabs>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import type { EepromLayoutKeys } from '~/src/eeprom';

const serialStore = useSerialStore();
const escStore = useEscStore();

// Гайд ArduPilot показываем только когда подключён полётник на ArduPilot.
const isArduPilot = computed(() => serialStore.mspData.type === 'ardu');

const firmwareVersion = computed(() => `${escStore.firstValidEscData?.data.settings.MAIN_REVISION ?? '0'}.${escStore.firstValidEscData?.data.settings.SUB_REVISION ?? '0'}`);
const layoutVersion = computed(() => escStore.firstValidEscData?.data.settings.LAYOUT_REVISION as number ?? 0);

// Beep patterns are shown as ascending/descending bars: bar height ~ relative pitch
const soundSignals = [{
    title: 'Протокол определён',
    bars: [1, 2, 3],
    color: 'bg-green-500',
    description: 'Три коротких восходящих сигнала по 75 мс. ESC распознал входной сигнал (DShot или Servo/PWM) после подачи питания.'
}, {
    title: 'Мотор готов к работе',
    bars: [3, 2, 1],
    color: 'bg-green-500',
    description: 'Три нисходящих сигнала по 100 мс при нулевом газе. Если включена отсечка «по элементу», мелодия повторяется — количество повторов равно числу банок АКБ.'
}, {
    title: 'Вход в калибровку газа',
    bars: [1, 2, 3, 4, 5, 6, 5, 4],
    color: 'bg-amber-500',
    description: 'Свип вверх ~1.2 с при подаче питания с удерживаемым максимальным газом. ESC ждёт калибровку диапазона.'
}, {
    title: 'Верхняя точка газа зафиксирована',
    bars: [3, 1],
    color: 'bg-amber-500',
    description: 'Два нисходящих сигнала по 150 мс. Переведите газ в минимум для завершения калибровки.'
}, {
    title: 'Диапазон газа сохранён',
    bars: [1, 3],
    color: 'bg-green-500',
    description: 'Два восходящих сигнала по 150 мс. Калибровка записана в EEPROM. Эта же мелодия играет при сохранении настроек.'
}];

// Morse: '.' = dot (60 ms), '-' = dash (180 ms), ' ' = gap between digits
const MORSE_DIGITS: Record<string, string> = {
    0: '-----',
    1: '.----',
    2: '..---'
};

const morseErrors = [10, 11, 12].map((code) => {
    const descriptions: Record<number, string> = {
        10: 'Нет входного сигнала — ESC перезагружается. Проверьте приёмник и подключение сигнального провода.',
        11: 'Ошибка внутренней калибровки.',
        12: 'Ошибка чтения EEPROM — не удалось прочитать настройки или информацию об устройстве. Требуется перепрошивка.'
    };
    return {
        code,
        description: descriptions[code],
        elements: String(code).split('').map(d => MORSE_DIGITS[d]).join(' ').split('')
    };
});

const onChange = (payload: { index: number, field: EepromLayoutKeys, value: boolean }) => {
    const data = escStore.escData[payload.index]?.data;
    if (!data) {
        return;
    }
    data.settingsDirty = data.settings[payload.field] !== (payload.value ? 1 : 0);
    data.settings[payload.field] = (payload.value ? 1 : 0);
};

const onToggle = (index: number) => {
    if (escStore.escData[index].data) {
        escStore.escData[index].data.isSelected = !escStore.escData[index].data.isSelected;
    }
};

const isInEEpromVersion = (escEeepromVersion: number, minVersion?: number, maxVersion?: number) => {
    return escEeepromVersion >= (minVersion ?? 0) && escEeepromVersion <= (maxVersion ?? 999);
};

const tabs = computed(() => {
    const ret = [
        { label: 'Base', slot: 'settings', icon: 'i-material-symbols-settings' },
        { label: 'Tune', slot: 'tune', icon: 'i-material-symbols-music-note' }
    ];
    return ret;
});

const protocolOptions = [
    {
        value: 0,
        label: 'Auto'
    },
    {
        value: 1,
        label: 'DShot'
    },
    {
        value: 2,
        label: 'Servo'
    },
    {
        value: 3,
        label: 'Serial'
    },
    {
        value: 4,
        label: 'EDT ARM'
    }
];

const brakeOnZeroThrottleOptions = [
    {
        value: 0,
        label: 'Off'
    },
    {
        value: 1,
        label: 'Coast'
    },
    {
        value: 2,
        label: 'Motor brake'
    },
    {
        value: 3,
        label: 'Delayed 5s'
    },
    {
        value: 4,
        label: 'Delayed 6s'
    },
    {
        value: 5,
        label: 'Delayed 7s'
    },
    {
        value: 6,
        label: 'Delayed 8s'
    },
    {
        value: 7,
        label: 'Delayed 9s'
    },
    {
        value: 8,
        label: 'Delayed 10s'
    },
    {
        value: 9,
        label: 'Delayed 11s'
    }
];

// Keep MINIMUM_RPM <= MAXIMUM_RPM when either of them changes
const validateRpmLimits = (settings: { MAXIMUM_RPM?: number, MINIMUM_RPM?: number }, field: EepromLayoutKeys, value: number) => {
    if (field === 'MINIMUM_RPM' && value > (settings.MAXIMUM_RPM ?? 0)) {
        settings.MAXIMUM_RPM = value;
    }
    if (field === 'MAXIMUM_RPM' && value < (settings.MINIMUM_RPM ?? 0)) {
        settings.MINIMUM_RPM = value;
    }
};

// Keep MINIMUM_DUTY_CYCLE <= MAXIMUM_DUTY_CYCLE. MINIMUM is stored in raw units
// (percent = raw * 0.5, via display-factor 0.5); MAXIMUM is stored in percent.
const validateDutyLimits = (settings: { MINIMUM_DUTY_CYCLE?: number, MAXIMUM_DUTY_CYCLE?: number }, field: EepromLayoutKeys, value: number) => {
    const minPct = (settings.MINIMUM_DUTY_CYCLE ?? 0) * 0.5;
    const maxPct = settings.MAXIMUM_DUTY_CYCLE ?? 100;
    if (field === 'MINIMUM_DUTY_CYCLE' && value * 0.5 > maxPct) {
        settings.MINIMUM_DUTY_CYCLE = Math.floor(maxPct / 0.5);
    }
    if (field === 'MAXIMUM_DUTY_CYCLE' && value < minPct) {
        settings.MAXIMUM_DUTY_CYCLE = Math.ceil(minPct);
    }
};

const onSettingsChange = ({ field, value, individual }: { field: EepromLayoutKeys, value: number | number[], individual?: number }) => {
    if (individual !== undefined) {
        const esc = escStore.selectedEscInfo[individual];
        if (!esc) {
            return;
        }
        esc.settings[field] = value;
        validateRpmLimits(esc.settings, field, Number(value));
        validateDutyLimits(esc.settings, field, Number(value));
        esc.settingsDirty = true;
    } else {
        for (const esc of escStore.selectedEscInfo) {
            esc.settings[field] = value;
            validateRpmLimits(esc.settings, field, Number(value));
            validateDutyLimits(esc.settings, field, Number(value));
            esc.settingsDirty = true;
        }
    }
};
</script>
