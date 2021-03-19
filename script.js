let get_questions_url = 'https://enigmatic-savannah-62566.herokuapp.com/questions/';

window.addEventListener('DOMContentLoaded', async () => {
    // TODO: Написать хеширование пароля

    /**
     * Отправка ответов на сервер
     */
    function saveBlob(blob, fileName) {
        var a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = fileName;
        a.dispatchEvent(new MouseEvent('click'));
    }

    function createDownloadButton(file_name) {
        let $btns_wrapper = document.querySelector('.question__container .question__btn-wrapper');
        let $link = $btns_wrapper.querySelector('#download');
        if (!$link) {
            $btns_wrapper.insertAdjacentHTML(`afterbegin`, `<a href="https://enigmatic-savannah-62566.herokuapp.com/questions/download/${file_name}" id="download">скачать статистику</a>`);
            $link = $btns_wrapper.querySelector('#download');

            let xhr = new XMLHttpRequest();
            $link.addEventListener('click', e => {
                e.preventDefault();
                xhr.open(
                    'get',
                    e.target.href,
                    true
                );
                xhr.setRequestHeader('authorization', sessionStorage.getItem('JWT'));
                xhr.responseType = 'blob';
                xhr.onloadend = () => {
                    saveBlob(xhr.response, file_name);
                }
                xhr.send();
            });
        }
    }

    document.querySelector('.container .question__container form').addEventListener('submit', async event => {
        event.preventDefault();
        let form_data = new FormData(event.target).entries();

        // сбор ответов
        let body = [...form_data].reduce((acc, answer) => {
            if (!answer[1]) {
                return acc;
            }

            if (acc[answer[0]]) {
                acc[answer[0]].push(answer[1]);
            } else {
                acc[answer[0]] = [answer[1]];
            }
            return acc;
        }, {});

        if (form_data) {
            let file_name = await sendAnswers(event.target.action, event.target.method, body);
            createDownloadButton(file_name);
        }
    });

    function sendAnswers(url, method, body) {
        let xhr = new XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.open(
                method,
                url,
                true
            );
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.setRequestHeader('authorization', sessionStorage.getItem('JWT'));
            xhr.responseType = `text`;
            xhr.onloadend = () => {
                if (xhr.status === 200) {
                    resolve(xhr.response);
                } else {
                    reject(xhr.status);
                }
            }
            xhr.send(JSON.stringify(body));
        });
    }

    /**
     * Если пользователь зарегестрирован заполняем вопросы
     */
    try {
        await fillQuestions();
        return
    } catch (e) {
        sessionStorage.removeItem(`JWT`);
    }


    let $form_container = document.querySelector('#forms'),
        $login_form = $form_container.querySelector('#login'),
        $auth_form = $form_container.querySelector('#auth'),
        $switcher = $form_container.querySelector('#switcher');

    /**
     * Переключение форм
     */
    $switcher.querySelector('#switcher__auth').addEventListener('click', () => {
        if ($auth_form.classList.contains('auth__form-wrapper_hidden')) {
            $auth_form.classList.remove('auth__form-wrapper_hidden');
            $login_form.classList.add('auth__form-wrapper_hidden');
        }
    });
    $switcher.querySelector('#switcher__login').addEventListener('click', () => {
        if ($login_form.classList.contains('auth__form-wrapper_hidden')) {
            $login_form.classList.remove('auth__form-wrapper_hidden');
            $auth_form.classList.add('auth__form-wrapper_hidden');
        }
    });


    /**
     * Обработка сабмита формы логина
     */
    $login_form.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        let form_data = Object.fromEntries([...new FormData(event.target)]);
        if (form_data.username && form_data.password) {
            try {
                await auth(form_data, event.target.action, event.target.method)
                await fillQuestions();
            } catch (e) {
                alert(`User not found`);
            }
        } else {
            alert(`Incorrect data`);
        }
    });


    /**
     * Обработка сабмита формы регистрации
     */
    $auth_form.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        let form_data = Object.fromEntries([...new FormData(event.target)]);
        if (form_data.username && form_data.password) {
            try {
                await auth(form_data, event.target.action, event.target.method);
                return fillQuestions();
            } catch (e) {
                alert(`Bad request`);
            }
        } else {
            alert(`Incorrect data`);
        }
    });


    /**
     * Логин/регистрация и запись токена авторизации в хранилище сессии
     * @param body {Object<{username, password}>}
     * @param url
     * @param method
     * @returns {Promise<>}
     */
    function auth(body, url, method = `post`) {
        let xhr = new XMLHttpRequest();
        return new Promise((resolve, reject) => {
            xhr.open(
                method,
                url,
                true
            );
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.responseType = `json`;
            xhr.onloadend = () => {
                if (xhr.status === 200) {
                    sessionStorage.setItem('JWT', xhr.response);
                    resolve();
                } else {
                    reject(xhr.status);
                }
            }
            xhr.send(JSON.stringify(body));
        });
    }

    /**
     * Заполнение формы вопросами
     * @returns {Promise<void>}
     */
    async function fillQuestions() {
        let questions = await getQuestions();


        document.querySelector('#auth__container').classList.add('auth__container_hidden');
        let $question_template = document.querySelector('template#question_wrapper').content;
        let $questions_container = document.querySelector('#questions');

        let type;
        questions.forEach(question => {
            $question_template.querySelector('.question__name').innerHTML = question.question;
            type = question.multiple_answer ? `checkbox` : `radio`;
            if (question.answers) {
                $question_template.querySelector('.question__answers').innerHTML = Object.keys(question.answers).reduce((acc, cur) => {
                    return acc + `
                        <label class="question__answer">
                            ${question.answers[cur]}
                            <input type="${type}" name="${question.id}" value="${cur}">
                        </label>
                        `;
                }, ``);
            } else {
                $question_template.querySelector('.question__answers').innerHTML = `<textarea name="${question.id}" class="textarea"></textarea>`;
            }
            let $current_question_wrapper = document.importNode($question_template, true);
            if (question.pre) {
                $current_question_wrapper.querySelector('.question__name')
                    .insertAdjacentHTML('afterend', `<pre>${question.pre}</pre>`);
            }
            /**
             * Регулярка для проверки поля
             */
            $current_question_wrapper.querySelector('.textarea')?.addEventListener('input', event => {
                if (event.data && !event.data.match(/\d/)) {
                    event.target.value = event.target.value.slice(0, -1);
                }
            });
            $questions_container.appendChild($current_question_wrapper);
        })
    }


    /**
     * Получение списка вопросов
     * @returns {Promise<Object>|null} список вопросов
     */
    function getQuestions() {
        let xhr = new XMLHttpRequest();

        return new Promise((resolve, reject) => {
            xhr.open(
                'get',
                get_questions_url,
                true,
            );
            xhr.responseType = `json`;
            xhr.setRequestHeader('authorization', sessionStorage.getItem('JWT'));
            xhr.onloadend = () => {
                if (xhr.status === 200) {
                    resolve(xhr.response.body);
                } else {
                    reject(xhr.status);
                }
            }
            xhr.send();
        });
    }
});