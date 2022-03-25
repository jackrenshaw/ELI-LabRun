#include <windows.h>
#include <stdio.h>
#include "NIDAQmx.h"
#include <math.h>

uInt32 convertBoolTouInt32(char *output){
  uInt32      data=0x00000000;
  int i;
  for (i = 0; i < strlen(output); i++) {
    if(output[i] == '1'){
      uInt32 val = 0x0000000f << (i*4);
      printf("\n%d",val);
      data = data+val;
    }
  }
  printf("\n%d",data);
  return data;
}

int main(int argc,char *argv[]){
  if(argc == 2){
    convertBoolTouInt32(argv[1]);
    
  }
}