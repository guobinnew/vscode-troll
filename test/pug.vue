<template lang="pug">
label
  //- abc
  input(type="checkbox" :key="abc" @click="handleClick")
  span(class=["abc","def"]) 记住密码
  .show-box
  template(lang="pug")
   span abC
</template>