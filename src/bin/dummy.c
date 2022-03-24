#include <stdio.h>

int main(int argc,char *argv[]){
  if(argc == 3){
    printf("Outputing:%s at pin:%s",argv[2],argv[1]);
  }
}