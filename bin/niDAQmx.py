from ni import NIDAQmxInstrument
daq = NIDAQmxInstrument()  # automatic acquisition of hardware

daq.ao0 = 2.7  # set the analog out 0 to 2.7V
daq.ao1 = 1.3  # set the analog out 1 to 1.3V

print(f'daq.ai0.value: {daq.ai0.value:.3f}V')  # print a single sample 
                                               # from analog input 0

values = daq.ai1.capture(
    sample_count=10, rate=100,
    max_voltage=10.0, min_voltage=-10.0,
    mode='differential', timeout=3.0
)  # capture 10 samples from ai1 at a rate of 100Hz in differential mode
print(values)

daq.port0.line2 = True  # set the daq.<port>.<line> to True or False to write
print(daq.port0.line3)  # read the daq.<port>.<line> to read state of line